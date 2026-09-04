import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMITS,
  rateLimit,
  resetRateLimitStore,
} from "./rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    resetRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = "test-a";
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok).toBe(true);
    }
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok).toBe(false);
  });

  it("resets after the window", () => {
    vi.useFakeTimers();
    const key = "test-b";
    expect(rateLimit(key, { limit: 1, windowMs: 1000 }).ok).toBe(true);
    expect(rateLimit(key, { limit: 1, windowMs: 1000 }).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, { limit: 1, windowMs: 1000 }).ok).toBe(true);
  });

  it("isolates keys", () => {
    expect(rateLimit("x", { limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit("y", { limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit("x", { limit: 1, windowMs: 60_000 }).ok).toBe(false);
  });

  it("documents sensitive endpoint presets", () => {
    expect(RATE_LIMITS.adminLogin.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.bookingCreate.limit).toBeLessThanOrEqual(15);
  });
});
