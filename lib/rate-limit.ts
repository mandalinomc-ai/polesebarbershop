/**
 * In-memory sliding-window rate limiter for serverless.
 * Best-effort across warm isolates — not a global distributed store.
 * Prefer server-side limits on sensitive endpoints only.
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

const MAX_KEYS = 5_000;

function prune(now: number, windowMs: number) {
  if (store.size < MAX_KEYS) return;
  for (const [key, bucket] of store) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) store.delete(key);
  }
  if (store.size >= MAX_KEYS) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
  now = Date.now(),
): RateLimitResult {
  prune(now, opts.windowMs);
  const bucket = store.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs);
  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    store.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSec };
  }
  bucket.timestamps.push(now);
  store.set(key, bucket);
  return {
    ok: true,
    remaining: Math.max(0, opts.limit - bucket.timestamps.length),
    retryAfterSec: 0,
  };
}

/** Test helper — clears all buckets. */
export function resetRateLimitStore() {
  store.clear();
}

/** Sensitive endpoint presets (Felice Polese). */
export const RATE_LIMITS = {
  adminLogin: { limit: 5, windowMs: 15 * 60_000 },
  bookingCreate: { limit: 8, windowMs: 60 * 60_000 },
  bookingCancel: { limit: 20, windowMs: 60 * 60_000 },
  bookingManageGet: { limit: 60, windowMs: 60 * 60_000 },
  adminNotify: { limit: 30, windowMs: 60 * 60_000 },
} as const;

export function rateLimitResponse(retryAfterSec: number, messageIt: string) {
  return {
    status: 429 as const,
    body: { error: messageIt },
    headers: { "Retry-After": String(retryAfterSec) },
  };
}
