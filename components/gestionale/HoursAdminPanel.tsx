"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type DayDraft = {
  weekday: number;
  label: string;
  isClosed: boolean;
  open: string;
  close: string;
  lunchEnabled: boolean;
  lunchStart: string;
  lunchEnd: string;
};

export type OutsideHoursAppt = {
  id: string;
  customerName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  barberId: string;
  barberName: string;
  serviceNames: string;
  dateLabel: string;
  timeLabel: string;
  startsAt: string;
  endsAt?: string;
  durationMin: number;
  durationOverrideMin?: number | null;
  effectiveDurationMin: number;
  reason: string;
};

const DAY_LABELS_IT = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

const DEFAULT_LUNCH_START = "13:00";
const DEFAULT_LUNCH_END = "14:00";

function lunchFits(open: string, close: string, start: string, end: string): boolean {
  return Boolean(open && close && start && end && start >= open && end <= close && end > start);
}

const EMPTY: DayDraft[] = Array.from({ length: 7 }, (_, weekday) => {
  const open = weekday === 1 ? "15:00" : "09:00";
  const close = weekday === 1 ? "19:00" : weekday >= 4 && weekday <= 6 ? "20:00" : "19:00";
  const lunchStart = DEFAULT_LUNCH_START;
  const lunchEnd = DEFAULT_LUNCH_END;
  const fits = lunchFits(open, close, lunchStart, lunchEnd);
  return {
    weekday,
    label: DAY_LABELS_IT[weekday] || `Giorno ${weekday}`,
    isClosed: weekday === 0,
    open,
    close,
    lunchEnabled: weekday !== 0 && fits,
    lunchStart,
    lunchEnd,
  };
});

export function HoursAdminPanel({
  onReschedule,
}: {
  /** Opens the existing “Sposta” modal so the barber picks date/time. */
  onReschedule?: (appt: OutsideHoursAppt) => void;
}) {
  const [days, setDays] = useState<DayDraft[]>(EMPTY);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [needsReschedule, setNeedsReschedule] = useState<OutsideHoursAppt[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/hours");
      const json = (await res.json()) as {
        error?: string;
        days?: Array<{
          weekday: number;
          label: string;
          isClosed: boolean;
          open: string | null;
          close: string | null;
          lunchEnabled: boolean;
          lunchStart: string | null;
          lunchEnd: string | null;
        }>;
        needsReschedule?: OutsideHoursAppt[];
      };
      if (!res.ok) {
        setError(json.error || "Impossibile caricare gli orari.");
        return;
      }
      const next = (json.days || [])
        .slice()
        .sort((a, b) => a.weekday - b.weekday)
        .map((d) => {
          const open = d.open || (d.weekday === 1 ? "15:00" : "09:00");
          const close =
            d.close ||
            (d.weekday === 1 ? "19:00" : d.weekday >= 4 && d.weekday <= 6 ? "20:00" : "19:00");
          const lunchStart = d.lunchStart || DEFAULT_LUNCH_START;
          const lunchEnd = d.lunchEnd || DEFAULT_LUNCH_END;
          return {
            weekday: d.weekday,
            label: d.label || DAY_LABELS_IT[d.weekday] || `Giorno ${d.weekday}`,
            isClosed: d.isClosed,
            open,
            close,
            lunchEnabled: d.isClosed ? false : Boolean(d.lunchEnabled),
            lunchStart,
            lunchEnd,
          };
        });
      if (next.length === 7) setDays(next);
      setNeedsReschedule(json.needsReschedule || []);
    } catch {
      setError("Connessione non disponibile.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchDay(weekday: number, patch: Partial<DayDraft>) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.weekday !== weekday) return d;
        const next = { ...d, ...patch };
        // If enabling lunch with empty times, seed 13:00–14:00.
        if (patch.lunchEnabled === true) {
          next.lunchStart = next.lunchStart || DEFAULT_LUNCH_START;
          next.lunchEnd = next.lunchEnd || DEFAULT_LUNCH_END;
        }
        return next;
      }),
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/admin/hours", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          days: days.map((d) => ({
            weekday: d.weekday,
            isClosed: d.isClosed,
            open: d.isClosed ? null : d.open,
            close: d.isClosed ? null : d.close,
            lunchEnabled: !d.isClosed && d.lunchEnabled,
            lunchStart: !d.isClosed && d.lunchEnabled ? d.lunchStart : null,
            lunchEnd: !d.isClosed && d.lunchEnabled ? d.lunchEnd : null,
          })),
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        needsReschedule?: OutsideHoursAppt[];
      };
      if (!res.ok) {
        setError(json.error || "Salvataggio non riuscito.");
        return;
      }
      const pending = json.needsReschedule || [];
      setNeedsReschedule(pending);
      setOkMsg(
        pending.length
          ? `Orari e pausa pranzo salvati. ${pending.length} prenotazion${
              pending.length === 1 ? "e da riprogrammare" : "i da riprogrammare"
            } — scegli tu il nuovo orario.`
          : "Orari e pausa pranzo salvati. Nessuna prenotazione fuori orario.",
      );
      await load();
    } catch {
      setError("Connessione non disponibile.");
    } finally {
      setSaving(false);
    }
  }

  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .map((wd) => days.find((d) => d.weekday === wd))
    .filter(Boolean) as DayDraft[];

  return (
    <section className="crm-hours-admin">
      <p className="crm-note">
        Per ogni giorno imposta apertura, chiusura e <strong>pausa pranzo</strong> (di solito
        13:00–14:00). Le modifiche aggiornano subito sito e slot prenotabili. Le prenotazioni fuori
        orario non si spostano da sole: le riprogrammi tu.
      </p>

      <form className="crm-hours-form" onSubmit={save}>
        <div className="crm-hours-grid">
          {ordered.map((d) => {
            const fits = lunchFits(d.open, d.close, d.lunchStart, d.lunchEnd);
            return (
              <article key={d.weekday} className={`crm-hours-day${d.isClosed ? " is-closed" : ""}`}>
                <header className="crm-hours-day-head">
                  <strong>{d.label || DAY_LABELS_IT[d.weekday] || `Giorno ${d.weekday}`}</strong>
                  <label className="crm-hours-check">
                    <input
                      type="checkbox"
                      checked={d.isClosed}
                      onChange={(e) => patchDay(d.weekday, { isClosed: e.target.checked })}
                    />
                    Chiuso
                  </label>
                </header>

                {!d.isClosed ? (
                  <>
                    <div className="crm-hours-row">
                      <label>
                        Apre
                        <input
                          className="input-lux"
                          type="time"
                          value={d.open}
                          onChange={(e) => patchDay(d.weekday, { open: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Chiude
                        <input
                          className="input-lux"
                          type="time"
                          value={d.close}
                          onChange={(e) => patchDay(d.weekday, { close: e.target.value })}
                          required
                        />
                      </label>
                    </div>

                    <div className={`crm-hours-lunch${d.lunchEnabled ? " is-on" : ""}`}>
                      <label className="crm-hours-check lunch-toggle">
                        <input
                          type="checkbox"
                          checked={d.lunchEnabled}
                          onChange={(e) =>
                            patchDay(d.weekday, { lunchEnabled: e.target.checked })
                          }
                        />
                        Pausa pranzo
                      </label>
                      <div className="crm-hours-row">
                        <label>
                          Inizio pausa
                          <input
                            className="input-lux"
                            type="time"
                            value={d.lunchStart}
                            onChange={(e) =>
                              patchDay(d.weekday, {
                                lunchStart: e.target.value,
                                lunchEnabled: true,
                              })
                            }
                            disabled={!d.lunchEnabled}
                            required={d.lunchEnabled}
                          />
                        </label>
                        <label>
                          Fine pausa
                          <input
                            className="input-lux"
                            type="time"
                            value={d.lunchEnd}
                            onChange={(e) =>
                              patchDay(d.weekday, {
                                lunchEnd: e.target.value,
                                lunchEnabled: true,
                              })
                            }
                            disabled={!d.lunchEnabled}
                            required={d.lunchEnabled}
                          />
                        </label>
                      </div>
                      {d.lunchEnabled && !fits ? (
                        <p className="crm-hours-lunch-hint">
                          La pausa deve stare dentro l&apos;orario di apertura ({d.open}–{d.close}).
                        </p>
                      ) : null}
                      {!d.lunchEnabled ? (
                        <p className="crm-hours-lunch-hint">
                          Spunta &quot;Pausa pranzo&quot; per bloccare gli slot (consigliato
                          13:00–14:00).
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="crm-hours-closed-note">Nessuna prenotazione online in questo giorno.</p>
                )}
              </article>
            );
          })}
        </div>

        {error ? <p className="crm-error">{error}</p> : null}
        {okMsg ? <p className="crm-ok">{okMsg}</p> : null}

        <div className="crm-hours-actions">
          <button type="submit" className="btn btn-ink" disabled={saving}>
            {saving ? "Salvataggio…" : "Salva orari e pausa pranzo"}
          </button>
        </div>
      </form>

      {needsReschedule.length ? (
        <section className="crm-hours-reschedule" aria-label="Prenotazioni da riprogrammare">
          <h3 className="font-serif">Da riprogrammare ({needsReschedule.length})</h3>
          <p className="crm-note">
            Queste prenotazioni non rientrano più negli orari. Tocca &quot;Scegli orario&quot; e
            decidi tu giorno e ora.
          </p>
          <ul>
            {needsReschedule.map((r) => (
              <li key={r.id} className="warn">
                <strong>{r.customerName}</strong>
                <span>
                  {r.dateLabel} · {r.timeLabel} · {r.serviceNames}
                </span>
                <small>{r.reason}</small>
                {onReschedule ? (
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={() => onReschedule(r)}
                  >
                    Scegli orario
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
