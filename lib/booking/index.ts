/**
 * Smart Booking Engine — Felice Polese.
 * Source of truth: see ./README.md
 */
export {
  BOOKING_BUFFER_MINUTES,
  SLOT_INTERVAL_MINUTES,
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
