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
  normalizeOptimizationMode,
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
  type FreeWindow,
  type RankedStart,
} from "./free-windows";
export {
  effectiveServiceDurationMin,
  resolveEffectiveServiceDuration,
  type DurationSource,
  type DurationKind,
  type EffectiveDurationResult,
} from "./duration";
export {
  clientDurationFromProcessing,
  barberBusySegments,
  processingBlockEnd,
  hasProcessingConfig,
  type BusySegment,
} from "./processing";
export type { ServiceProcessing } from "@/lib/catalog";
export {
  CONFIG_CALENDAR_BLOCKS,
  blocksForDate,
  busyMinutesFromBlocks,
  utcBusyFromBlocks,
  type CalendarBlock,
} from "./calendar-blocks";
export {
  sortByBest,
  pickBestStart,
  suggestFillGaps,
  freeWindowsFromBusyLabels,
  type FillGapSuggestion,
} from "./optimize";
export {
  CALENDAR_UNAVAILABLE_IT,
  CLOSED_DAY_IT,
  NO_SLOTS_IT,
  SLOT_TAKEN_IT,
  isTechnicalBookingMessage,
  publicAvailabilityMessage,
  publicBookingWarnings,
} from "./public-messages";
