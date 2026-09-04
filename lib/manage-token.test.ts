import { describe, expect, it } from "vitest";
import {
  MANAGE_TOKEN_HEX_LEN,
  createManageToken,
  isManageTokenFormat,
} from "./manage-token";

describe("manage tokens", () => {
  it("creates 64-hex cryptographically random tokens", () => {
    const a = createManageToken();
    const b = createManageToken();
    expect(a).toHaveLength(MANAGE_TOKEN_HEX_LEN);
    expect(b).toHaveLength(MANAGE_TOKEN_HEX_LEN);
    expect(a).not.toBe(b);
    expect(isManageTokenFormat(a)).toBe(true);
  });

  it("accepts legacy 48-hex tokens", () => {
    expect(isManageTokenFormat("a".repeat(48))).toBe(true);
    expect(isManageTokenFormat("a".repeat(32))).toBe(false);
    expect(isManageTokenFormat("not-hex!!!!")).toBe(false);
    expect(isManageTokenFormat("")).toBe(false);
  });
});
