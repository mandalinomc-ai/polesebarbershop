import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./supabase-query";

describe("fetchAllPages", () => {
  it("loads every page until a short final page", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 3 }], error: null });

    const { data, error } = await fetchAllPages(fetchPage, 2);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 3);
  });

  it("returns rows collected before an error", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "boom", code: "500", details: "", hint: "" },
      });

    const { data, error } = await fetchAllPages(fetchPage, 1);
    expect(data).toEqual([{ id: 1 }]);
    expect(error?.message).toBe("boom");
  });
});
