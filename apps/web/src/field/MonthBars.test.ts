import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { monthOfYearTally } from "./MonthBars";

describe("monthOfYearTally", () => {
  it("adds up each month across the years, January first", () => {
    const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
    const at = (y: number, m: number) => ({ ...base, id: `${y}-${m}`, caughtAt: new Date(y, m, 10, 9).toISOString() });
    const rows = monthOfYearTally([at(2026, 9), at(2025, 9), at(2026, 0)]);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({ month: 1, count: 1 });
    expect(rows[9]).toEqual({ month: 10, count: 2 });
  });

  it("counts the same fish the month's search finds", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const rows = monthOfYearTally(book.catches);
    expect(findCatches(book, "October", t).length).toBe(rows[9]!.count);
    expect(findCatches(book, "September", t).length).toBe(rows[8]!.count);
  });
});
