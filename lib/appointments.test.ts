import { describe, expect, it } from "vitest";
import { occupiesSlot, shouldAttachCalendarReminder } from "./appointments";

describe("cancelled appointments", () => {
  it("free the chair", () => {
    expect(occupiesSlot("confirmed")).toBe(true);
    expect(occupiesSlot("pending")).toBe(true);
    expect(occupiesSlot("walk_in")).toBe(true);
    expect(occupiesSlot("completed")).toBe(true);
    expect(occupiesSlot("cancelled")).toBe(false);
  });

  it("do not receive the 30-minute calendar reminder", () => {
    expect(shouldAttachCalendarReminder("confirmed")).toBe(true);
    expect(shouldAttachCalendarReminder("cancelled")).toBe(false);
  });
});
