import { ONLINE_DISPLAY_INTERVAL_MINUTES } from "./constants";
import type { FillGapSuggestion } from "./optimize";

/**
 * Last-minute “buco” booking — short online services only (acconciatura / barbe).
 * Fills tight leftover gaps that start off the half-hour public grid.
 */
export const LAST_MINUTE_MAX_DURATION_MIN = 20;

/** Only offer gap slots on the civil day “today” (Europe/Rome). */
export const LAST_MINUTE_SAME_DAY_ONLY = true;

export function isLastMinuteEligibleDuration(durationMin: number): boolean {
  return Number.isFinite(durationMin) && durationMin > 0 && durationMin <= LAST_MINUTE_MAX_DURATION_MIN;
}

/** Wall-clock :00 / :30 — normal online grid. */
export function isOnlineGridStart(startMin: number): boolean {
  return startMin % ONLINE_DISPLAY_INTERVAL_MINUTES === 0;
}

/**
 * Keep fill-gap tips that start off the half-hour grid (true leftover “buchi”).
 * Same-label half-hour starts stay in the normal `slots` list.
 */
export function filterLastMinuteGapTips(input: {
  tips: FillGapSuggestion[];
}): FillGapSuggestion[] {
  return input.tips.filter(
    (t) => t.label && Number.isFinite(t.startMin) && !isOnlineGridStart(t.startMin),
  );
}
