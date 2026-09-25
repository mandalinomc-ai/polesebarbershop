const DEFAULT_COUNTRY = "39";

/**
 * Sanitize and normalise any customer phone to E.164 for WhatsApp / SMS.
 *
 * - Strips spaces, dashes, parentheses, dots and other non-digit noise
 * - Keeps a leading `+` / converts `00` international prefix
 * - If no country code is present, defaults to Italy `+39`
 *   (e.g. `3331234567` → `+393331234567`)
 */
export function normalizeWhatsAppNumber(raw: string): string | null {
  if (!raw) return null;

  let value = String(raw).trim();
  if (!value) return null;

  // Remove every character that is not a digit or a leading plus.
  value = value.replace(/[^\d+]/g, "");
  // Keep only the first leading +, drop any others that slipped in.
  if (value.includes("+")) {
    value = value.startsWith("+")
      ? `+${value.slice(1).replace(/\+/g, "")}`
      : value.replace(/\+/g, "");
  }

  if (value.startsWith("00")) value = `+${value.slice(2)}`;

  if (value.startsWith("+")) {
    const digits = value.slice(1).replace(/\D/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }

  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  // Already includes Italian country code without +: 39XXXXXXXXX
  if (digits.startsWith(DEFAULT_COUNTRY) && digits.length >= 11 && digits.length <= 13) {
    return `+${digits}`;
  }

  // Strip trunk zero (03xx… → 3xx…) then apply +39.
  const national = digits.replace(/^0+/, "");
  if (!national || national.length < 8) return null;

  // Italian mobiles are 9–10 digits starting with 3.
  if (/^3\d{8,9}$/.test(national)) {
    return `+${DEFAULT_COUNTRY}${national}`;
  }

  // Other national numbers (landline etc.): still default to Italy for this salon.
  if (national.length >= 8 && national.length <= 11) {
    return `+${DEFAULT_COUNTRY}${national}`;
  }

  return null;
}

export const normalizeItalianPhone = normalizeWhatsAppNumber;

/** Alias used by WhatsApp send paths — same E.164 +39 sanitizer. */
export const sanitizeWhatsAppPhone = normalizeWhatsAppNumber;

/** Wizard phone field: national digits or a full +39 number. */
export function resolveBookingPhone(raw: string): string | null {
  const direct = normalizeItalianPhone(raw);
  if (direct) return direct;
  if (/^\s*\+/.test(raw)) return null;
  return normalizeItalianPhone(`+39${raw}`);
}
