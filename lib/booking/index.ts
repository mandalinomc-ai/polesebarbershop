/**
 * Smart Booking Engine — Felice Polese.
 * Source of truth: see ./README.md and /docs/SMART_BOOKING_ENGINE.md
 */
export {
  BOOKING_BUFFER_MINUTES,
  SLOT_INTERVAL_MINUTES,
  TIME_SLOT_INTERVAL_MINUTES,
  ONLINE_DISPLAY_INTERVAL_MINUTES,
  DEFAULT_OPTIMIZATION_MODE,
  type OptimizationMode,
  type SlotRank,
} from "./constants";
export { overlaps, rangesOverlap } from "./overlap";
export {
  addMinutes,
  formatWallDate,
  formatWallTime,
  minutesToTime,
  TIMEZONE,
  timeToMinutes,
  wallTimeToUtc,
} from "./time-utils";
export {
  blockEndFromStart,
  candidateStartLabels,
  chairBlockMinutes,
  clientEndFromStart,
  isIntervalFree,
  type BusyInterval,
} from "./engine";
export {
  workingWindowsFromHours,
  subtractBusyFromWindows,
  candidateStartsInWindows,
  freeWindowStarts,
  effectiveServiceDurationMin,
  type FreeWindow,
  type RankedStart,
} from "./free-windows";
