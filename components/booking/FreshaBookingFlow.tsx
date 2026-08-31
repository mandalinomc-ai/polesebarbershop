"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BARBERS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatPriceRange,
  totalsForServices,
  type Service,
} from "@/lib/catalog";
import {
  formatItalianDate,
  getAvailableSlots,
  getFirstBookableDate,
  isClosedDay,
} from "@/lib/availability";
import { CANCEL_HOURS_BEFORE, SITE } from "@/lib/site-config";
import { normalizeItalianPhone } from "@/lib/phone";
import { icsDataUri } from "@/lib/ics";

const STEPS = ["Servizi", "Barbiere", "Data e ora", "I tuoi dati", "Conferma"] as const;

type ApiSlot = {
  start: string;
  end: string;
  label: string;
  barberId: string;
};

type DayChip = { date: string; dow: string; day: string };

function openDays(from: string, count: number): DayChip[] {
  const days: DayChip[] = [];
  const [y, m, d] = from.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dowFmt = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    timeZone: "UTC",
  });
  const dayFmt = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    timeZone: "UTC",
  });
  while (days.length < count) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!isClosedDay(iso)) {
      days.push({
        date: iso,
        dow: dowFmt.format(cursor).replace(".", ""),
        day: dayFmt.format(cursor),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter((p) => p !== "&")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FreshaBookingFlow() {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState("anyone");
  const firstBookable = useMemo(() => getFirstBookableDate(), []);
  const days = useMemo(() => openDays(firstBookable, 16), [firstBookable]);
  const [date, setDate] = useState(days[0]?.date || firstBookable);
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [slotsState, setSlotsState] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");
  const [slotsWarning, setSlotsWarning] = useState("");
  const [slot, setSlot] = useState<ApiSlot | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{
    manageUrl: string;
    barberName: string;
    ics: string;
    icsFilename: string;
    googleCalendarUrl: string;
    warnings: string[];
    emailSent: boolean;
    persisted: boolean;
  } | null>(null);

  const selectedServices = useMemo(
    () =>
      selectedIds
        .map((id) => SERVICES.find((s) => s.id === id))
        .filter(Boolean) as Service[],
    [selectedIds],
  );
  const totals = useMemo(
    () => totalsForServices(selectedServices),
    [selectedServices],
  );
  const barber = BARBERS.find((b) => b.id === barberId);

  const localSlots = useCallback((): ApiSlot[] => {
    if (!date || totals.durationMin <= 0) return [];
    return getAvailableSlots({
      date,
      barberId,
      durationMinutes: totals.durationMin,
    }).map((s) => ({
      start: s.startIso,
      end: s.endIso,
      label: s.label,
      barberId: s.barberId,
    }));
  }, [date, barberId, totals.durationMin]);

  const loadSlots = useCallback(async () => {
    if (!date || totals.durationMin <= 0) return;
    setSlotsState("loading");
    setSlotsWarning("");
    try {
      const params = new URLSearchParams({
        date,
        barberId,
        serviceIds: selectedIds.join(","),
        duration: String(totals.durationMin),
      });
      const res = await fetch(`/api/availability?${params.toString()}`);
      const json = (await res.json()) as {
        slots?: ApiSlot[];
        error?: string;
        warning?: string;
      };
      if (!res.ok) throw new Error(json.error || "Errore orari");
      const incoming = json.slots || [];
      setSlots(incoming.length ? incoming : localSlots());
      setSlotsWarning(json.warning || "");
      setSlotsState("ready");
    } catch (err) {
      setSlots(localSlots());
      setSlotsState("ready");
      setSlotsWarning(
        err instanceof Error
          ? `${err.message} Mostriamo gli orari locali.`
          : "Calendario locale: gli orari potrebbero non riflettere le prenotazioni reali.",
      );
    }
  }, [date, barberId, totals.durationMin, selectedIds, localSlots]);

  useEffect(() => {
    if (step >= 3 && totals.durationMin > 0) {
      void loadSlots();
    }
  }, [step, loadSlots, totals.durationMin]);

  useEffect(() => {
    setSlot(null);
  }, [date, barberId, selectedIds.join("|")]);

  function toggleService(id: string) {
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );
  }

  function canContinue(): boolean {
    if (step === 1) return selectedIds.length > 0;
    if (step === 2) return Boolean(barberId);
    if (step === 3) return Boolean(slot);
    if (step === 4) {
      return (
        firstName.trim().length > 1 &&
        lastName.trim().length > 1 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
        Boolean(normalizeItalianPhone(`+39${phone}`)) &&
        gdpr
      );
    }
    return true;
  }

  async function confirm() {
    if (!slot) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedIds,
          barberId,
          date,
          startTime: slot.label,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: `+39${phone}`,
          gdprConsent: true,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        manageUrl?: string;
        barberName?: string;
        ics?: string;
        icsFilename?: string;
        googleCalendarUrl?: string;
        warnings?: string[];
        emailSent?: boolean;
        persisted?: boolean;
      };
      if (!res.ok && !json.ics) {
        setSubmitError(json.error || "Prenotazione non riuscita.");
        if (res.status === 409) void loadSlots();
        return;
      }
      setSuccess({
        manageUrl: json.manageUrl || "#",
        barberName: json.barberName || barber?.name || "",
        ics: json.ics || "",
        icsFilename: json.icsFilename || "polese-barbershop.ics",
        googleCalendarUrl: json.googleCalendarUrl || "",
        warnings: json.warnings || (json.error ? [json.error] : []),
        emailSent: Boolean(json.emailSent),
        persisted: Boolean(json.persisted),
      });
    } catch {
      setSubmitError("Connessione non disponibile. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  function onPrimary() {
    if (step < 5) {
      if (!canContinue()) return;
      setStep((s) => s + 1);
      return;
    }
    void confirm();
  }

  if (success) {
    return (
      <div className="fresha-booking" id="booking-wizard">
        <div className="fresha-body success-box">
          <p className="eyebrow">Confermata</p>
          <h3 className="font-serif">Grazie, {firstName}.</h3>
          <p className="prose">
            Prenotazione per <strong>{totals.names}</strong> con{" "}
            <strong>{success.barberName}</strong> il {formatItalianDate(date)}{" "}
            alle {slot?.label} · {totals.priceLabel}.
          </p>
          <p className="prose">
            Aggiungi l&apos;appuntamento al calendario (Apple o Google). Il file
            .ics ha un solo promemoria: 30 minuti prima. Nessun avviso a 1 giorno
            o a 1 ora.
          </p>
          <div className="success-actions">
            {success.ics ? (
              <button
                type="button"
                className="btn btn-gold btn-magnetic"
                onClick={() => downloadIcs(success.icsFilename, success.ics)}
              >
                Apple Calendar (.ics)
              </button>
            ) : null}
            {success.googleCalendarUrl ? (
              <a
                className="btn btn-outline btn-magnetic"
                href={success.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Calendar
              </a>
            ) : null}
            {success.ics ? (
              <a className="btn btn-outline btn-magnetic" href={icsDataUri(success.ics)} download={success.icsFilename}>
                Scarica .ics
              </a>
            ) : null}
          </div>
          {success.emailSent ? (
            <p className="booking-open-note">
              Ti abbiamo inviato una email di conferma con l&apos;allegato .ics.
            </p>
          ) : null}
          {success.warnings.map((w) => (
            <p key={w} className="field-error">
              {w}
            </p>
          ))}
          {success.persisted && success.manageUrl !== "#" ? (
            <p>
              <a href={success.manageUrl}>Gestisci o disdici l&apos;appuntamento</a>
              {" — "}puoi annullare fino a {CANCEL_HOURS_BEFORE} ore prima; lo
              slot si libera e il promemoria di 30 minuti non parte.
            </p>
          ) : (
            <p className="booking-open-note">
              Lo slot non è ancora in agenda: chiama il {SITE.phone} per
              confermare o disdire.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fresha-booking" id="booking-wizard">
      <div className="fresha-booking-head">
        <button
          type="button"
          className="fresha-back"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          Indietro
        </button>
        <p className="fresha-step-label">
          Passo {step} di 5 · {STEPS[step - 1]}
        </p>
        <div className="fresha-progress" aria-hidden="true">
          {STEPS.map((_, i) => (
            <i
              key={STEPS[i]}
              className={i + 1 < step ? "done" : i + 1 === step ? "on" : ""}
            />
          ))}
        </div>
      </div>

      <div className="fresha-body">
        {step === 1 && (
          <>
            <h3>Scegli i servizi</h3>
            {SERVICE_CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="fresha-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
                {SERVICES.filter((s) => s.category === cat).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`fresha-option${selectedIds.includes(s.id) ? " selected" : ""}`}
                    onClick={() => toggleService(s.id)}
                    aria-pressed={selectedIds.includes(s.id)}
                  >
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.durationMin} min · {s.description}
                      </small>
                    </span>
                    <span className="meta">{formatPriceRange(s)}</span>
                  </button>
                ))}
              </div>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <h3>Scegli il barbiere</h3>
            <div className="barber-grid">
              {BARBERS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`barber-card${barberId === b.id ? " selected" : ""}`}
                  onClick={() => setBarberId(b.id)}
                >
                  <span className="barber-avatar">
                    {b.virtual ? "✦" : initials(b.name)}
                  </span>
                  <strong>{b.name}</strong>
                  <small style={{ color: "var(--silk)" }}>{b.title}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3>Data e orario</h3>
            <div className="day-scroller" role="listbox" aria-label="Giorni disponibili">
              {days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  className={`day-chip${date === d.date ? " selected" : ""}`}
                  onClick={() => setDate(d.date)}
                >
                  <span className="dow">{d.dow}</span>
                  <span className="dom">{d.day}</span>
                </button>
              ))}
            </div>
            {slotsState === "loading" && (
              <p className="slot-status">Caricamento orari…</p>
            )}
            {slotsWarning ? (
              <p className="slot-status">{slotsWarning}</p>
            ) : null}
            {slotsState === "ready" && slots.length === 0 && (
              <p className="slot-status">
                Nessuno slot disponibile per questo giorno.
              </p>
            )}
            {slots.length > 0 && (
              <div className="slot-grid">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    className={`slot-btn${slot?.start === s.start ? " selected" : ""}`}
                    onClick={() => setSlot(s)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h3>I tuoi dati</h3>
            <div className="customer-fields">
              <input
                className="input-lux"
                placeholder="Nome"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                className="input-lux"
                placeholder="Cognome"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <input
                className="input-lux"
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="phone-row">
                <input
                  className="input-lux phone-prefix"
                  value="+39"
                  readOnly
                  aria-label="Prefisso Italia"
                />
                <input
                  className="input-lux"
                  type="tel"
                  placeholder="327 015 6225"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <label className="gdpr-row">
                <input
                  type="checkbox"
                  checked={gdpr}
                  onChange={(e) => setGdpr(e.target.checked)}
                  required
                />
                <span>
                  Acconsento al trattamento dei dati per la prenotazione, ai
                  sensi del GDPR (UE 2016/679).{" "}
                  <a href="/privacy-policy">Informativa privacy</a>.
                </span>
              </label>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h3>Conferma</h3>
            <ul className="summary-list">
              <li>
                Servizi <strong>{totals.names}</strong>
              </li>
              <li>
                Barbiere <strong>{barber?.name}</strong>
              </li>
              <li>
                Quando{" "}
                <strong>
                  {formatItalianDate(date)} · {slot?.label}
                </strong>
              </li>
              <li>
                Durata <strong>{totals.durationMin} min</strong>
              </li>
              <li>
                Totale <strong>{totals.priceLabel}</strong>
              </li>
              <li>
                Cliente{" "}
                <strong>
                  {firstName} {lastName}
                </strong>
              </li>
              <li>
                Telefono{" "}
                <strong>
                  {normalizeItalianPhone(`+39${phone}`) || `+39 ${phone}`}
                </strong>
              </li>
            </ul>
            {submitError ? <p className="field-error">{submitError}</p> : null}
            <p className="booking-open-note" style={{ marginTop: "1rem" }}>
              Riceverai una email di conferma con file .ics (un solo
              promemoria, 30 minuti prima). Puoi disdire dal link in email.
              {" "}{SITE.pricesIncludeVat}
            </p>
          </>
        )}
      </div>

      <div className="fresha-footer">
        <div className="fresha-totals">
          <span>
            {totals.durationMin
              ? `${totals.durationMin} min`
              : "Nessun servizio"}
            {selectedIds.length
              ? ` · ${selectedIds.length} selezionat${selectedIds.length === 1 ? "o" : "i"}`
              : ""}
          </span>
          <strong>{selectedIds.length ? totals.priceLabel : "—"}</strong>
        </div>
        <button
          type="button"
          className="btn btn-gold btn-magnetic"
          disabled={!canContinue() || submitting}
          onClick={onPrimary}
        >
          {step === 5
            ? submitting
              ? "Invio…"
              : "Conferma prenotazione"
            : "Continua"}
        </button>
      </div>
    </div>
  );
}

export function BookingSectionNote() {
  return (
    <p className="booking-open-note">
      Prenota online in cinque passi. Orari {SITE.hours.weekdays}. Primo giorno
      disponibile: {formatItalianDate(getFirstBookableDate())}. Barbieri: Felice
      e Davide.
    </p>
  );
}
