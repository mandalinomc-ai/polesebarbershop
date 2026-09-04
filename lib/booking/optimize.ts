import {
  DEFAULT_OPTIMIZATION_MODE,
  type OptimizationMode,
  type SlotRank,
} from "./constants";
import type { FreeWindow, RankedStart } from "./free-windows";
import {
  candidateStartsInWindows,
  subtractBusyFromWindows,
  workingWindowsFromHours,
} from "./free-windows";
import { minutesToTime, timeToMinutes } from "./time-utils";

export type FillGapSuggestion = {
  startMin: number;
  label: string;
  windowStartMin: number;
  windowEndMin: number;
  gapMin: number;
  rank: SlotRank;
  reason: string;
};

/**
 * Rank candidates for TROVA MIGLIORE:
 * OPTIMAL first, then VALID, then POSSIBLE; within tier by score then earliest.
 */
export function sortByBest(starts: RankedStart[]): RankedStart[] {
  const tier = (r: SlotRank) => (r === "OPTIMAL" ? 0 : r === "VALID" ? 1 : 2);
  return [...starts].sort((a, b) => {
    const td = tier(a.rank) - tier(b.rank);
    if (td !== 0) return td;
    if (a.score !== b.score) return a.score - b.score;
    return a.startMin - b.startMin;
  });
}

export function pickBestStart(starts: RankedStart[]): RankedStart | null {
  const sorted = sortByBest(starts);
  return sorted[0] ?? null;
}

/**
 * RIEMPI BUCO — internal suggestion: left-align into free windows that are
 * tight enough to pack (gap ≈ block or leftover small). Not a public UI feature.
 */
export function suggestFillGaps(input: {
  freeWindows: FreeWindow[];
  serviceDurationMin: number;
  bufferMinutes?: number;
  mode?: OptimizationMode;
  /** Prefer windows whose size is at most this multiple of the block (default 2). */
  maxWindowFactor?: number;
}): FillGapSuggestion[] {
  const ranked = candidateStartsInWindows(input.freeWindows, input.serviceDurationMin, {
    bufferMinutes: input.bufferMinutes,
    mode: input.mode ?? DEFAULT_OPTIMIZATION_MODE,
    displayIntervalMinutes: null,
  });
  const blockApprox =
    input.serviceDurationMin + Math.max(0, input.bufferMinutes ?? 5);
  const factor = input.maxWindowFactor ?? 2;
  const out: FillGapSuggestion[] = [];

  for (const w of input.freeWindows) {
    const gapMin = w.endMin - w.startMin;
    if (gapMin < blockApprox) continue;
    if (gapMin > blockApprox * factor) continue;
    const left = ranked.find((s) => s.startMin === w.startMin && s.windowStartMin === w.startMin);
    if (!left) continue;
    out.push({
      startMin: left.startMin,
      label: left.label,
      windowStartMin: w.startMin,
      windowEndMin: w.endMin,
      gapMin,
      rank: left.rank,
      reason: `Riempie buco ${minutesToTime(w.startMin)}–${minutesToTime(w.endMin)} (${gapMin} min)`,
    });
  }
  return out.sort((a, b) => a.gapMin - b.gapMin || a.startMin - b.startMin);
}

/** Busy labels → free windows helper for gap suggestions. */
export function freeWindowsFromBusyLabels(input: {
  open: string;
  close: string;
  pause?: { start: string; end: string } | null;
  busyLabels?: { start: string; end: string }[];
  busyMinutes?: FreeWindow[];
}): FreeWindow[] {
  const working = workingWindowsFromHours(input.open, input.close, input.pause);
  const busy: FreeWindow[] = [
    ...(input.busyMinutes || []),
    ...(input.busyLabels || []).map((b) => ({
      startMin: timeToMinutes(b.start),
      endMin: timeToMinutes(b.end),
    })),
  ];
  return subtractBusyFromWindows(working, busy);
}
