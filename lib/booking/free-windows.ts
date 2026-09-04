import {
  BOOKING_BUFFER_MINUTES,
  DEFAULT_OPTIMIZATION_MODE,
  ONLINE_DISPLAY_INTERVAL_MINUTES,
  TIME_SLOT_INTERVAL_MINUTES,
  type OptimizationMode,
  type SlotRank,
} from "./constants";
import { minutesToTime, timeToMinutes } from "./time-utils";

function blockMinutes(serviceDurationMin: number, bufferMinutes: number): number {
  if (serviceDurationMin <= 0) return 0;
  return serviceDurationMin + Math.max(0, bufferMinutes);
}

/** Half-open wall-clock window in minutes from midnight: [startMin, endMin). */
export type FreeWindow = { startMin: number; endMin: number };

export type RankedStart = {
  startMin: number;
  label: string;
  rank: SlotRank;
  /** Lower is better (gap waste / packing). */
  score: number;
  windowStartMin: number;
  windowEndMin: number;
  leftoverMin: number;
};

/**
 * Build working windows from shop hours (and optional pause).
 * Continuous — no rounding to TIME_SLOT_INTERVAL.
 */
export function workingWindowsFromHours(
  open: string,
  close: string,
  pause?: { start: string; end: string } | null,
): FreeWindow[] {
  const openMin = timeToMinutes(open);
  const closeMin = timeToMinutes(close);
  if (!(closeMin > openMin)) return [];
  if (!pause) return [{ startMin: openMin, endMin: closeMin }];
  const p0 = timeToMinutes(pause.start);
  const p1 = timeToMinutes(pause.end);
  if (!(p1 > p0) || p1 <= openMin || p0 >= closeMin) {
    return [{ startMin: openMin, endMin: closeMin }];
  }
  const windows: FreeWindow[] = [];
  if (p0 > openMin) windows.push({ startMin: openMin, endMin: Math.min(p0, closeMin) });
  if (p1 < closeMin) windows.push({ startMin: Math.max(p1, openMin), endMin: closeMin });
  return windows.filter((w) => w.endMin > w.startMin);
}

/** Subtract busy [start,end) intervals from free windows. Continuous — no grid snap. */
export function subtractBusyFromWindows(
  windows: FreeWindow[],
  busy: FreeWindow[],
): FreeWindow[] {
  let free = windows.map((w) => ({ ...w }));
  const ordered = [...busy]
    .filter((b) => b.endMin > b.startMin)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  for (const b of ordered) {
    const next: FreeWindow[] = [];
    for (const w of free) {
      if (b.endMin <= w.startMin || b.startMin >= w.endMin) {
        next.push(w);
        continue;
      }
      if (b.startMin > w.startMin) {
        next.push({ startMin: w.startMin, endMin: Math.min(b.startMin, w.endMin) });
      }
      if (b.endMin < w.endMin) {
        next.push({ startMin: Math.max(b.endMin, w.startMin), endMin: w.endMin });
      }
    }
    free = next.filter((w) => w.endMin > w.startMin);
  }
  return free;
}

function rankStart(
  startMin: number,
  window: FreeWindow,
  block: number,
  mode: OptimizationMode,
): { rank: SlotRank; score: number; leftoverMin: number } {
  const leftover = window.endMin - (startMin + block);
  const gapFromWindowStart = startMin - window.startMin;

  if (mode === "ELIMINATE_GAPS") {
    return {
      leftoverMin: leftover,
      rank: leftover === 0 || leftover >= block ? "OPTIMAL" : "VALID",
      score: leftover,
    };
  }
  if (mode === "REDUCE_GAPS") {
    const score = gapFromWindowStart * 10 + leftover;
    let rank: SlotRank = "POSSIBLE";
    if (startMin === window.startMin) {
      rank = leftover === 0 || leftover >= block ? "OPTIMAL" : "VALID";
    } else if (leftover === 0) {
      rank = "VALID";
    }
    return { leftoverMin: leftover, rank, score };
  }
  // REGULAR
  let rank: SlotRank = startMin === window.startMin ? "VALID" : "POSSIBLE";
  if (leftover === 0) rank = "OPTIMAL";
  return { leftoverMin: leftover, rank, score: startMin };
}

/**
 * Fit service+buffer into free windows → candidate start minutes.
 * First start in each window is the continuous free start (e.g. 09:42), never forced to 09:45.
 */
export function candidateStartsInWindows(
  windows: FreeWindow[],
  serviceDurationMin: number,
  opts?: {
    bufferMinutes?: number;
    searchIntervalMinutes?: number;
    mode?: OptimizationMode;
    /** Online thinning; null = keep every search step. */
    displayIntervalMinutes?: number | null;
  },
): RankedStart[] {
  const buffer = opts?.bufferMinutes ?? BOOKING_BUFFER_MINUTES;
  const block = blockMinutes(serviceDurationMin, buffer);
  if (block <= 0) return [];
  const mode = opts?.mode ?? DEFAULT_OPTIMIZATION_MODE;
  const searchStep = Math.max(1, opts?.searchIntervalMinutes ?? TIME_SLOT_INTERVAL_MINUTES);
  const displayStep =
    opts?.displayIntervalMinutes === undefined
      ? ONLINE_DISPLAY_INTERVAL_MINUTES
      : opts.displayIntervalMinutes;

  const out: RankedStart[] = [];

  for (const w of windows) {
    const lastStart = w.endMin - block;
    if (lastStart < w.startMin) continue;

    if (mode === "ELIMINATE_GAPS") {
      const leftover = w.endMin - (w.startMin + block);
      // Skip if left-align would leave an unusable hole.
      if (leftover > 0 && leftover < block) continue;
      const { rank, score, leftoverMin } = rankStart(w.startMin, w, block, mode);
      out.push({
        startMin: w.startMin,
        label: minutesToTime(w.startMin),
        rank,
        score,
        windowStartMin: w.startMin,
        windowEndMin: w.endMin,
        leftoverMin,
      });
      continue;
    }

    const rawStarts: number[] = [];
    for (let t = w.startMin; t <= lastStart; t += searchStep) {
      rawStarts.push(t);
    }
    if (rawStarts[rawStarts.length - 1] !== lastStart) {
      rawStarts.push(lastStart);
    }

    for (const startMin of [...new Set(rawStarts)].sort((a, b) => a - b)) {
      if (startMin < w.startMin || startMin > lastStart) continue;
      const { rank, score, leftoverMin } = rankStart(startMin, w, block, mode);

      if (displayStep != null) {
        const offset = startMin - w.startMin;
        const onDisplayGrid = offset % displayStep === 0;
        const keep =
          startMin === w.startMin ||
          leftoverMin === 0 ||
          rank === "OPTIMAL" ||
          onDisplayGrid;
        if (!keep) continue;
        // Online REDUCE_GAPS: hide weak POSSIBLE micro-slots even on display grid
        if (mode === "REDUCE_GAPS" && rank === "POSSIBLE" && !onDisplayGrid) continue;
      }

      out.push({
        startMin,
        label: minutesToTime(startMin),
        rank,
        score,
        windowStartMin: w.startMin,
        windowEndMin: w.endMin,
        leftoverMin,
      });
    }
  }

  return out.sort((a, b) => a.startMin - b.startMin);
}

/** Convenience: hours → busy → ranked starts. */
export function freeWindowStarts(input: {
  open: string;
  close: string;
  pause?: { start: string; end: string } | null;
  busyLabels?: { start: string; end: string }[];
  busyMinutes?: FreeWindow[];
  serviceDurationMin: number;
  bufferMinutes?: number;
  searchIntervalMinutes?: number;
  mode?: OptimizationMode;
  displayIntervalMinutes?: number | null;
}): RankedStart[] {
  const working = workingWindowsFromHours(input.open, input.close, input.pause);
  const busy: FreeWindow[] = [
    ...(input.busyMinutes || []),
    ...(input.busyLabels || []).map((b) => ({
      startMin: timeToMinutes(b.start),
      endMin: timeToMinutes(b.end),
    })),
  ];
  const free = subtractBusyFromWindows(working, busy);
  return candidateStartsInWindows(free, input.serviceDurationMin, {
    bufferMinutes: input.bufferMinutes,
    searchIntervalMinutes: input.searchIntervalMinutes,
    mode: input.mode,
    displayIntervalMinutes: input.displayIntervalMinutes,
  });
}

/**
 * Effective service duration for occupancy: override wins, else catalog duration.
 * Catalog rows are never mutated.
 */
export function effectiveServiceDurationMin(
  catalogDurationMin: number,
  durationOverrideMin?: number | null,
): number {
  if (durationOverrideMin != null && durationOverrideMin > 0) {
    return durationOverrideMin;
  }
  return catalogDurationMin;
}
