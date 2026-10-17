import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { TABLE_YEARS, monthYearCounts } from "./MonthYearTable";

describe("monthYearCounts", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const at = (y: number, m: number) => ({ ...base, id: `${y}-${m}-${Math.random()}`, caughtAt: new Date(y, m, 10, 9).toISOString() });

  it("counts each month of each year, keeping the newest years", () => {
    const { years, counts } = monthYearCounts([at(2021, 5), at(2022, 5), at(2023, 5), at(2024, 5), at(2025, 5), at(2025, 5), at(2026, 9)]);
    expect(years).toHaveLength(TABLE_YEARS);
    expect(years).toEqual(["2023", "2024", "2025", "2026"]);
    expect(counts.get("2025-06")).toBe(2);
    expect(counts.get("2026-10")).toBe(1);
  });
});
