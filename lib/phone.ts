const DEFAULT_COUNTRY = "39";

/**
 * Normalise an Italian phone number to E.164 (+39…).
 * Italian mobiles (starting with 3, 9–10 digits) default to +39.
 * Accepts already-prefixed international numbers.
 */
export function normalizeWhatsAppNumber(raw: string): string | null {
  if (!raw) return null;
  let value = raw.trim();
  value = value.replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;

  if (value.startsWith("+")) {
    const digits = value.slice(1).replace(/\D/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }

  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith(DEFAULT_COUNTRY) && digits.length >= 11) {
    return `+${digits}`;
  }

  const national = digits.replace(/^0+/, "");
  if (/^3\d{8,9}$/.test(national)) {
    return `+${DEFAULT_COUNTRY}${national}`;
  }

  if (digits.length >= 8) {
    return `+${DEFAULT_COUNTRY}${national}`;
  }
  return null;
}

export const normalizeItalianPhone = normalizeWhatsAppNumber;

/** Wizard phone field: national digits or a full +39 number. */
export function resolveBookingPhone(raw: string): string | null {
  const direct = normalizeItalianPhone(raw);
  if (direct) return direct;
  if (/^\s*\+/.test(raw)) return null;
  return normalizeItalianPhone(`+39${raw}`);
}
