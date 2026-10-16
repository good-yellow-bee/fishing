import { describe, expect, it } from "vitest";
import { CATCH_PAGE, jumpMarks } from "./PagedCatches";

describe("jumpMarks", () => {
  it("offers nothing while the list fits one page or covers few months", () => {
    expect(jumpMarks(["2026-10", "2026-09", "2026-08"], CATCH_PAGE)).toEqual([]);
    expect(jumpMarks(["2026-10", "2026-09"], 200)).toEqual([]);
  });

  it("offers each month of a long list in its order", () => {
    expect(jumpMarks(["2026-10", "2026-09", "2026-08"], 120).map((mark) => mark.month)).toEqual(["2026-10", "2026-09", "2026-08"]);
  });

  it("jumps by year once the months run past a year", () => {
    const months = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(2026, 9 - index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    });
    expect(jumpMarks(months, 300)).toEqual([
      { month: "2026-10", byYear: true },
      { month: "2025-12", byYear: true },
    ]);
  });
});
