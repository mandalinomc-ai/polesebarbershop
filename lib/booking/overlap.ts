/**
 * Semi-open interval overlap: [aStart, aEnd) overlaps [bStart, bEnd)
 * iff aStart < bEnd && bStart < aEnd.
 */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return overlaps(aStart, aEnd, bStart, bEnd);
}
