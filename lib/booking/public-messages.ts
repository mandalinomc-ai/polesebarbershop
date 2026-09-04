/**
 * Client-facing Italian copy for booking / availability.
 * Never expose engine jargon (durationUnknown, assisted, n/d, inventata, DB, override).
 */

export const CALENDAR_UNAVAILABLE_IT =
  "Calendario non disponibile. Riprova tra poco.";

export const CLOSED_DAY_IT = "Il salone è chiuso in questo giorno.";

export const NO_SLOTS_IT = "Nessuno slot disponibile per questo giorno.";

export const SLOT_TAKEN_IT =
  "Questo orario non è più disponibile. Scegline un altro.";

/** True when a string looks like developer / engine jargon — hide from clients. */
export function isTechnicalBookingMessage(message: string): boolean {
  return /durationUnknown|durata non definita|durata non determinabile|n\/d|inventat|override|gestionale|assisted|sourceUnavailable|supabase|database non|schema|PGRST|verificat|servizio senza durata|durata nota|duration_min|buffer|smart booking|engine/i.test(
    message,
  );
}

/**
 * Map API / internal errors to a short Italian line safe for the booking wizard.
 * Empty string = show nothing (silent — e.g. technical false negatives).
 */
export function publicAvailabilityMessage(
  raw: string | undefined | null,
  opts?: { closed?: boolean; beforeOpening?: boolean; openingLabel?: string },
): string {
  if (opts?.closed) return CLOSED_DAY_IT;
  if (opts?.beforeOpening && opts.openingLabel) {
    return `Le prenotazioni aprono dal ${opts.openingLabel}.`;
  }
  const text = (raw || "").trim();
  if (!text) return "";
  if (/chiuso/i.test(text)) return CLOSED_DAY_IT;
  if (/prenotazioni aprono/i.test(text)) return text;
  if (isTechnicalBookingMessage(text)) return CALENDAR_UNAVAILABLE_IT;
  // Keep short operational Italian; strip nested engine phrases.
  if (text.length > 160) return CALENDAR_UNAVAILABLE_IT;
  return text;
}

/** Sanitize post-booking warning list — drop jargon, keep actionable Italian. */
export function publicBookingWarnings(warnings: string[]): string[] {
  const out: string[] = [];
  for (const w of warnings) {
    const text = (w || "").trim();
    if (!text) continue;
    if (/testing emails|invalid_access|403|honeypot/i.test(text)) continue;
    if (isTechnicalBookingMessage(text)) {
      // Persistence / mail infra failures → one gentle line max.
      if (/database|supabase|salvata|schema/i.test(text)) {
        const gentle =
          "La prenotazione potrebbe non essere in agenda: chiama il salone per confermare.";
        if (!out.includes(gentle)) out.push(gentle);
      }
      continue;
    }
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
