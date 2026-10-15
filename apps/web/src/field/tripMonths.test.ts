import { describe, expect, it } from "vitest";
import { recentTrips, sampleLogbook } from "@stillwater/shared";
import { catchMonth, tripsByMonth } from "./tripMonths";

describe("trips by month", () => {
  it("cuts a newest-first list into months and keeps every trip in order", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const recent = recentTrips(book, "2026-10-15");
    const months = tripsByMonth(recent);
    expect(months.map((row) => row.month)).toEqual(["2026-10", "2026-09"]);
    expect(months.flatMap((row) => row.trips)).toEqual(recent);
  });

  it("gives nothing for no trips", () => {
    expect(tripsByMonth([])).toEqual([]);
  });

  it("files a fish under the month of its local day", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const entry = book.catches[0]!;
    const local = new Date(entry.caughtAt);
    const month = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}`;
    expect(catchMonth(entry)).toBe(month);
  });
});
