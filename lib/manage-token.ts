import { randomBytes } from "node:crypto";

/** 32 bytes → 64 hex chars (192-bit entropy). */
export const MANAGE_TOKEN_BYTES = 32;
export const MANAGE_TOKEN_HEX_LEN = MANAGE_TOKEN_BYTES * 2;

const HEX_RE = new RegExp(`^[a-f0-9]{${MANAGE_TOKEN_HEX_LEN}}$`);

export function createManageToken(): string {
  return randomBytes(MANAGE_TOKEN_BYTES).toString("hex");
}

/** Accept current 64-hex tokens and legacy 48-hex (24-byte) tokens. */
export function isManageTokenFormat(token: string | undefined | null): boolean {
  if (!token) return false;
  if (HEX_RE.test(token)) return true;
  // Legacy bookings created with randomBytes(24)
  return /^[a-f0-9]{48}$/.test(token);
}
