import { describe, expect, it } from "vitest";
import {
  defaultShopHoursState,
  formatDisplayHours,
  lunchBlocksFromHours,
  validateWeekdayHours,
  weekHoursToMap,
} from "./runtime-shop-hours";

describe("runtime shop hours", () => {
  it("defaults match catalog open days and lunch on Tue–Sat", () => {
    const state = defaultShopHoursState();
    const map = weekHoursToMap(state.days);
    expect(map[0]).toBeNull();
    expect(map[1]).toEqual({ open: "15:00", close: "19:00" });
    expect(map[2]).toEqual({ open: "09:00", close: "19:00" });
    const lunch = lunchBlocksFromHours(state.days);
    expect(lunch.every((b) => b.kind === "lunch")).toBe(true);
    expect(lunch.some((b) => b.weekday === 1)).toBe(false); // Mon opens 15:00 — no 13–14 lunch
    expect(lunch.some((b) => b.weekday === 2 && b.start === "13:00")).toBe(true);
  });

  it("rejects lunch outside opening hours", () => {
    const err = validateWeekdayHours({
      weekday: 2,
      isClosed: false,
      open: "09:00",
      close: "12:00",
      lunchEnabled: true,
      lunchStart: "13:00",
      lunchEnd: "14:00",
    });
    expect(err).toMatch(/pausa pranzo/i);
  });

  it("formats display lines for the contact block", () => {
    const display = formatDisplayHours(defaultShopHoursState());
    expect(display.sunday).toMatch(/Chiuso/);
    expect(display.monday).toMatch(/15:00/);
    expect(display.weekdays).toMatch(/09:00/);
  });
});
