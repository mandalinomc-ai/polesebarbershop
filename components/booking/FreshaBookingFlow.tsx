"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BARBERS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatDuration,
  formatPriceRange,
  totalsForServices,
  servicesAreOnlineBookable,
  onlineBookingBlockReason,
  type Service,
} from "@/lib/catalog";
import {
  WEEKDAY_LABELS_IT,
  addMonths,
  formatItalianDate,
  formatItalianMonth,
  getFirstBookableDate,
  listOpenDayChips,
  monthCalendarWeeks,
  startOfMonth,
} from "@/lib/availability";
import {
  BOOKING_DATE_EVENT,
  BOOKING_SERVICE_EVENT,
  BOOKING_SELECTION_SYNC_EVENT,
  BOOKING_UI_DAYS,
  CANCEL_NOTICE_IT,
  SITE,
  getWhatsAppUrl,
  readBookingDateFromLocation,
  readBookingServiceFromLocation,
} from "@/lib/site-config";
import { normalizeItalianPhone, resolveBookingPhone } from "@/lib/phone";
import { icsDataUri } from "@/lib/ics";
import {
  CALENDAR_UNAVAILABLE_IT,
  NO_SLOTS_IT,
  publicAvailabilityMessage,
  publicBookingWarnings,
} from "@/lib/booking";

const STEPS = ["Servizio", "Barbiere", "Data", "Orario", "I tuoi dati", "Conferma"] as const;

type ApiSlot = {
  start: string;
  end: string;
  label: string;
  barberId: string;
  available?: boolean;
  booked?: boolean;
};

type DayOccupancyChip = { full: boolean };

function isSlotTaken(slot: ApiSlot) {
  return slot.booked === true || slot.available === false;
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
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function FreshaBookingFlow({
  listinoBeside = false,
}: {
  listinoBeside?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState("anyone");
  const firstBookable = useMemo(() => getFirstBookableDate(), []);
  const days = useMemo(() => listOpenDayChips(BOOKING_UI_DAYS), []);
  const [date, setDate] = useState(days[0]?.date || firstBookable);
  const [month, setMonth] = useState(startOfMonth(days[0]?.date || firstBookable));
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [dayOccupancy, setDayOccupancy] = useState<Record<string, DayOccupancyChip>>(
    {},
  );
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
  /** Invisible honeypot — leave empty; bots that fill it are dropped server-side. */
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{
    manageUrl: string;
    barberName: string;
    ics: string;
    icsFilename: string;
    googleCalendarUrl: string;
    whatsappUrl: string;
    warnings: string[];
    persisted: boolean;
  } | null>(null);

  const selectedServices = useMemo(
    () =>
      selectedIds
        .map((id) => SERVICES.find((s) => s.id === id))
        .filter(Boolean) as Service[],
    [selectedIds],
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(BOOKING_SELECTION_SYNC_EVENT, { detail: selectedIds }),
    );
  }, [selectedIds]);
  const totals = useMemo(
    () => totalsForServices(selectedServices),
    [selectedServices],
  );
  const onlineBlockedReason = useMemo(
    () => onlineBookingBlockReason(selectedServices),
    [selectedServices],
  );
  const barber = BARBERS.find((b) => b.id === barberId);

  useEffect(() => {
    const apply = (iso: string | null) => {
      if (!iso) return;
      if (days.some((d) => d.date === iso)) setDate(iso);
    };
    apply(readBookingDateFromLocation());
    const onPick = (event: Event) => {
      apply((event as CustomEvent<string>).detail);
    };
    window.addEventListener(BOOKING_DATE_EVENT, onPick);
    return () => window.removeEventListener(BOOKING_DATE_EVENT, onPick);
  }, [days]);

  useEffect(() => {
    const apply = (serviceId: string | null, opts?: { replace?: boolean }) => {
      if (!serviceId) return;
      if (!SERVICES.some((s) => s.id === serviceId)) return;
      setSelectedIds((curr) => {
        if (opts?.replace) return [serviceId];
        return curr.includes(serviceId)
          ? curr.filter((x) => x !== serviceId)
          : [...curr, serviceId];
      });
      // Stay on service step so the client can add more before Continua.
      setStep(1);
    };
    apply(readBookingServiceFromLocation(), { replace: true });
    const onPick = (event: Event) => {
      apply((event as CustomEvent<string>).detail);
    };
    window.addEventListener(BOOKING_SERVICE_EVENT, onPick);
    return () => window.removeEventListener(BOOKING_SERVICE_EVENT, onPick);
  }, []);

  const loadSlots = useCallback(async () => {
    if (!date || totals.durationMin <= 0 || onlineBlockedReason) return;
    setSlotsState("loading");
    setSlotsWarning("");
    try {
      const params = new URLSearchParams({
        date,
        barberId,
        serviceIds: selectedIds.join(","),
        duration: String(totals.durationMin),
        summaryDates: days.map((d) => d.date).join(","),
      });
      const res = await fetch(`/api/availability?${params.toString()}`);
      const json = (await res.json()) as {
        slots?: ApiSlot[];
        days?: { date: string; full?: boolean }[];
        error?: string;
        warning?: string;
        sourceUnavailable?: boolean;
      };
      if (!res.ok || json.sourceUnavailable) {
        setSlots([]);
        setSlot(null);
        setSlotsState("error");
        setSlotsWarning(
          publicAvailabilityMessage(json.warning || json.error) ||
            CALENDAR_UNAVAILABLE_IT,
        );
        return;
      }
      const incoming = Array.isArray(json.slots) ? json.slots : [];
      // Smart available starts only — no endless booked micro-slots.
      const availableOnly = incoming.filter((s) => !isSlotTaken(s));
      setSlots(availableOnly);
      setSlot((curr) => {
        if (!curr) return curr;
        const match = availableOnly.find((s) => s.start === curr.start);
        if (!match) return null;
        return match;
      });
      if (Array.isArray(json.days)) {
        const next: Record<string, DayOccupancyChip> = {};
        for (const row of json.days) {
          if (row?.date) next[row.date] = { full: Boolean(row.full) };
        }
        setDayOccupancy(next);
      }
      setSlotsWarning(publicAvailabilityMessage(json.warning) || "");
      setSlotsState("ready");
    } catch {
      setSlots([]);
      setSlot(null);
      setSlotsState("error");
      setSlotsWarning(CALENDAR_UNAVAILABLE_IT);
    }
  }, [date, barberId, totals.durationMin, selectedIds, days, onlineBlockedReason]);

  useEffect(() => {
    if (step >= 3 && totals.durationMin > 0 && !onlineBlockedReason) {
      void loadSlots();
    }
  }, [step, loadSlots, totals.durationMin, onlineBlockedReason]);

  useEffect(() => {
    setSlot(null);
  }, [date, barberId, selectedIds.join("|")]);

  useEffect(() => {
    setMonth(startOfMonth(date));
  }, [date]);

  function toggleService(id: string) {
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );
  }

  function canContinue(): boolean {
    if (step === 1) {
      return selectedIds.length > 0 && servicesAreOnlineBookable(selectedServices);
    }
    if (step === 2) return Boolean(barberId);
    if (step === 3) return Boolean(date);
    if (step === 4) return Boolean(slot && !isSlotTaken(slot));
    if (step === 5) {
      return (
        firstName.trim().length > 1 &&
        lastName.trim().length > 1 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
        Boolean(resolveBookingPhone(phone)) &&
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
          phone: resolveBookingPhone(phone) || phone,
          gdprConsent: true,
          website,
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
        persisted?: boolean;
        customerWhatsAppUrl?: string | null;
        salonWhatsAppUrl?: string | null;
      };
      if (!res.ok && !json.ics) {
        setSubmitError(
          publicAvailabilityMessage(json.error) ||
            "Prenotazione non riuscita.",
        );
        if (res.status === 409) void loadSlots();
        return;
      }
      setSuccess({
        manageUrl: json.manageUrl || "#",
        barberName: json.barberName || barber?.name || "",
        ics: json.ics || "",
        icsFilename: json.icsFilename || "polese-barbershop.ics",
        googleCalendarUrl: json.googleCalendarUrl || "",
        whatsappUrl:
          json.customerWhatsAppUrl ||
          json.salonWhatsAppUrl ||
          getWhatsAppUrl(),
        warnings: publicBookingWarnings(
          json.warnings || (json.error ? [json.error] : []),
        ),
        persisted: Boolean(json.persisted),
      });
    } catch {
      setSubmitError(CALENDAR_UNAVAILABLE_IT);
    } finally {
      setSubmitting(false);
    }
  }

  function onPrimary() {
    if (step < 6) {
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
            Prenotazione confermata per <strong>{totals.names}</strong> con{" "}
            <strong>{success.barberName}</strong> il {formatItalianDate(date)}{" "}
            alle {slot?.label} · {totals.priceLabel}.
          </p>
          <div className="success-whatsapp-row">
            <a
              className="btn btn-whatsapp"
              href={success.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              INVIA ORA IL PROMEMORIA APPUNTAMENTO
            </a>
            <p className="booking-open-note">
              Invia al salone il riepilogo della prenotazione con un tap.
            </p>
          </div>
          <p className="prose success-calendar-label">
            Aggiungi al tuo calendario
          </p>
          <div className="success-actions" aria-label="Aggiungi al calendario">
            {success.ics ? (
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => downloadIcs(success.icsFilename, success.ics)}
              >
                Apple Calendar (.ics)
              </button>
            ) : null}
            {success.googleCalendarUrl ? (
              <a
                className="btn btn-outline"
                href={success.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Calendar
              </a>
            ) : null}
            {success.ics ? (
              <a className="btn btn-outline" href={icsDataUri(success.ics)} download={success.icsFilename}>
                Scarica .ics
              </a>
            ) : null}
          </div>
          {success.warnings.map((w) => (
            <p key={w} className="booking-open-note">
              {w}
            </p>
          ))}
          {success.persisted && success.manageUrl !== "#" ? (
            <p>
              <a href={success.manageUrl}>Gestisci o disdici l&apos;appuntamento</a>
              {" — "}puoi annullare fino a {CANCEL_NOTICE_IT} prima; lo
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
    <div className="fresha-layout">
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
          Passo {step} di {STEPS.length} · {STEPS[step - 1]}
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
        {step === 1 && listinoBeside && (
          <>
            <h3>Servizi scelti</h3>
            <p className="booking-open-note">
              Tocca i servizi nel listino per aggiungerli o toglierli. Puoi
              combinare più servizi: la durata prevista si aggiorna da sola.
            </p>
            {onlineBlockedReason ? (
              <p className="field-error">{onlineBlockedReason}</p>
            ) : null}
            {selectedServices.length === 0 ? (
              <p className="slot-status">Nessun servizio selezionato.</p>
            ) : (
              selectedServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="fresha-option selected"
                  onClick={() => toggleService(s.id)}
                  aria-pressed="true"
                >
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {s.description}
                      {` · ${formatDuration(s)}`}
                    </small>
                  </span>
                  <span className="meta">{formatPriceRange(s)}</span>
                </button>
              ))
            )}
          </>
        )}

        {step === 1 && !listinoBeside && (
          <>
            <h3>Scegli il servizio</h3>
            <p className="booking-open-note">
              Seleziona uno o più servizi. La durata prevista si somma in
              automatico. I prezzi a fascia si definiscono in salone.
            </p>
            {onlineBlockedReason ? (
              <p className="field-error">{onlineBlockedReason}</p>
            ) : null}
            {SERVICE_CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="fresha-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
                {SERVICES.filter((s) => s.category === cat && s.active !== false).map((s) => {
                  return (
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
                        {s.description}
                        {` · ${formatDuration(s)}`}
                      </small>
                    </span>
                    <span className="meta">{formatPriceRange(s)}</span>
                  </button>
                  );
                })}
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
            <h3>Scegli la data</h3>
            <div className="booking-calendar" aria-label="Calendario prenotazione">
              <div className="booking-calendar-nav">
                <button
                  type="button"
                  className="fresha-back"
                  onClick={() => setMonth((curr) => addMonths(curr, -1))}
                  aria-label="Mese precedente"
                >
                  ‹
                </button>
                <p className="booking-calendar-month">{formatItalianMonth(month)}</p>
                <button
                  type="button"
                  className="fresha-back"
                  onClick={() => setMonth((curr) => addMonths(curr, 1))}
                  aria-label="Mese successivo"
                >
                  ›
                </button>
              </div>
              <div className="booking-calendar-weekdays">
                {WEEKDAY_LABELS_IT.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="booking-calendar-grid" role="grid" aria-label="Giorni del mese">
                {monthCalendarWeeks(month).flat().map((cell, index) => {
                  if (!cell) {
                    return <span key={`pad-${index}`} className="cal-day pad" />;
                  }
                  const bookable = days.some((d) => d.date === cell.date);
                  const full = Boolean(dayOccupancy[cell.date]?.full);
                  const selected = date === cell.date;
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      className={`cal-day${selected ? " selected" : ""}${!bookable || cell.closed ? " muted" : ""}${full ? " full" : ""}`}
                      disabled={!bookable}
                      onClick={() => {
                        if (!bookable) return;
                        setDate(cell.date);
                      }}
                      aria-label={
                        full
                          ? `${formatItalianDate(cell.date)}, completamente prenotato`
                          : formatItalianDate(cell.date)
                      }
                    >
                      {Number(cell.date.slice(8))}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3>Scegli l&apos;orario</h3>
            <p className="booking-open-note">{formatItalianDate(date)}</p>
            {slotsState === "loading" && (
              <p className="slot-status">Caricamento orari…</p>
            )}
            {slotsWarning ? (
              <p className="slot-status">{slotsWarning}</p>
            ) : null}
            {slotsState === "error" ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void loadSlots()}
              >
                Riprova
              </button>
            ) : null}
            {slotsState === "ready" && slots.length === 0 && !slotsWarning && (
              <p className="slot-status">{NO_SLOTS_IT}</p>
            )}
            {slots.length > 0 && (
              <div className="slot-grid" role="list" aria-label="Orari disponibili">
                {slots.map((s) => {
                  const selected = slot?.start === s.start;
                  return (
                  <button
                    key={s.start}
                    type="button"
                    className={`slot-btn${selected ? " selected" : ""}`}
                    aria-label={s.label}
                    onClick={() => setSlot(s)}
                  >
                    {s.label}
                  </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <h3>I tuoi dati</h3>
            <div className="customer-fields">
              <input
                className="input-lux"
                placeholder="Nome"
                autoComplete="given-name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                className="input-lux"
                placeholder="Cognome"
                autoComplete="family-name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <input
                className="input-lux"
                type="email"
                inputMode="email"
                placeholder="Email"
                autoComplete="email"
                enterKeyHint="next"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="phone-row">
                <input
                  className="input-lux phone-prefix"
                  value="+39"
                  readOnly
                  tabIndex={-1}
                  aria-label="Prefisso Italia"
                />
                <input
                  className="input-lux"
                  type="tel"
                  inputMode="tel"
                  placeholder="327 015 6225"
                  autoComplete="tel-national"
                  enterKeyHint="done"
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
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="booking-website">Sito web</label>
                <input
                  id="booking-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {step === 6 && (
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
                Durata <strong>{totals.durationLabel}</strong>
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
                  {normalizeItalianPhone(phone) || resolveBookingPhone(phone) || `+39 ${phone}`}
                </strong>
              </li>
            </ul>
            {submitError ? <p className="field-error">{submitError}</p> : null}
            <p className="booking-open-note" style={{ marginTop: "1rem" }}>
              Dopo la conferma aggiungi l&apos;appuntamento al calendario (.ics)
              e invia il riepilogo al salone su WhatsApp. Promemoria unico: 30
              minuti prima. Puoi disdire dal link di gestione.
              {" "}{SITE.pricesIncludeVat}
            </p>
          </>
        )}
      </div>

      <div className="fresha-footer" aria-label="Riepilogo ordine">
        <div className="fresha-totals">
          <span>
            {totals.durationMin ? totals.durationLabel : "Nessun servizio"}
            {selectedIds.length
              ? ` · ${selectedIds.length} selezionat${selectedIds.length === 1 ? "o" : "i"}`
              : ""}
          </span>
          <strong>{selectedIds.length ? totals.priceLabel : "—"}</strong>
        </div>
        <button
          type="button"
          className="btn btn-dark"
          disabled={!canContinue() || submitting}
          onClick={onPrimary}
        >
          {step === 6
            ? submitting
              ? "Invio…"
              : "Conferma prenotazione"
            : "Continua"}
        </button>
      </div>
    </div>

      <aside className="appointment-sidebar" aria-label="Il tuo appuntamento">
        <h3 className="appointment-sidebar-title font-serif">Il tuo appuntamento</h3>
        {selectedIds.length === 0 ? (
          <p className="appointment-sidebar-empty">
            Tocca i servizi nel listino qui a fianco: qui vedi subito cosa hai scelto.
          </p>
        ) : (
          <ul className="appointment-sidebar-list">
            {selectedServices.map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                <span>{formatDuration(s)} · {formatPriceRange(s)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="appointment-sidebar-totals">
          <span>
            {totals.durationMin ? totals.durationLabel : "—"}
            {selectedIds.length
              ? ` · ${selectedIds.length} ${selectedIds.length === 1 ? "servizio" : "servizi"}`
              : ""}
          </span>
          <strong>{selectedIds.length ? totals.priceLabel : "—"}</strong>
        </div>
        {step >= 4 && slot ? (
          <p className="appointment-sidebar-when">
            {formatItalianDate(date)} · {slot.label}
            {barber ? ` · ${barber.name}` : ""}
          </p>
        ) : null}
        <a
          className="btn btn-whatsapp appointment-sidebar-wa"
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          Aiuto WhatsApp
        </a>
      </aside>
    </div>
  );
}

export function BookingSectionNote() {
  return (
    <div className="booking-open-note booking-open-note--stack">
      <p className="booking-note-headline">Prenota già ora</p>
      <p className="booking-note-lead">
        Scegli servizio, barbiere, data e orario — anche prima dell&apos;apertura
        ufficiale.
      </p>
      <div className="booking-note-blocks" role="list">
        <div className="booking-note-block" role="listitem">
          <span className="booking-note-label">Orari</span>
          <p>{SITE.hours.weekdays}</p>
          <p className="booking-note-sub">Domenica chiuso</p>
        </div>
        <div className="booking-note-block" role="listitem">
          <span className="booking-note-label">Primo giorno</span>
          <p>{formatItalianDate(getFirstBookableDate())}</p>
          <p className="booking-note-sub">Apertura ufficiale</p>
        </div>
        <div className="booking-note-block" role="listitem">
          <span className="booking-note-label">Barbieri</span>
          <p>Felice · Davide</p>
          <p className="booking-note-sub">o Qualsiasi disponibilità</p>
        </div>
        <div className="booking-note-block" role="listitem">
          <span className="booking-note-label">Prenotazioni</span>
          <p>Illimitate</p>
          <p className="booking-note-sub">
            Ogni orario libero resta prenotabile — nessun tetto totale.
          </p>
        </div>
      </div>
    </div>
  );
}
