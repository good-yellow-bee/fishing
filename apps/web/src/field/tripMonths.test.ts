import { describe, expect, it } from "vitest";
import { recentTrips, sampleLogbook } from "@stillwater/shared";
import { tripsByMonth } from "./tripMonths";

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
});
