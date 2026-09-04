/** Operational buffer after each booking — occupies the chair, hidden from the client. */
export const BOOKING_BUFFER_MINUTES = 5;

/**
 * Search / display step inside free windows.
 * Does NOT round free-window starts (continuous calendar).
 * Alias kept as SLOT_INTERVAL_MINUTES for existing imports.
 */
export const TIME_SLOT_INTERVAL_MINUTES = 5;
export const SLOT_INTERVAL_MINUTES = TIME_SLOT_INTERVAL_MINUTES;

/**
 * Online UI thinning: within a large free window, show starts at this cadence
 * (always still includes the continuous free-window start).
 */
export const ONLINE_DISPLAY_INTERVAL_MINUTES = 15;

/**
 * Gap optimization — internal default for Felice (no confusing UI toggle).
 * - FLEXIBLE: all search-interval starts inside free windows
 * - REDUCE_GAPS (default): prefer packing from free-window start; online shows smart subset
 * - ELIMINATE_GAPS: only starts that leave no unusable leftover (left-aligned / perfect fit)
 *
 * `REGULAR` is a deprecated alias of `FLEXIBLE` (kept for older tests/callers).
 */
export type OptimizationMode = "FLEXIBLE" | "REDUCE_GAPS" | "ELIMINATE_GAPS" | "REGULAR";

export const DEFAULT_OPTIMIZATION_MODE: OptimizationMode = "REDUCE_GAPS";

/** Normalize legacy REGULAR → FLEXIBLE. */
export function normalizeOptimizationMode(mode: OptimizationMode | undefined | null): Exclude<OptimizationMode, "REGULAR"> {
  if (!mode || mode === "REGULAR" || mode === "FLEXIBLE") return "FLEXIBLE";
  return mode;
}

/** Ranking tiers for candidates. */
export type SlotRank = "POSSIBLE" | "VALID" | "OPTIMAL";
