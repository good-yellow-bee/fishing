import { describe, expect, it } from "vitest";
import { localDate, recentTrips, sampleLogbook } from "@stillwater/shared";
import { catchMonth, daysOut, monthTally, tripsByMonth, yearTally } from "./tripMonths";

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

describe("month tally", () => {
  it("counts fish per month, newest month first, up to the limit", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const rows = monthTally(book.catches);
    expect(rows.map((row) => row.month)).toEqual(["2026-10", "2026-09"]);
    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(book.catches.length);
    expect(monthTally(book.catches, 1)).toEqual([rows[0]]);
  });
});

describe("year tally", () => {
  it("counts fish per year, newest year first", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const old = { ...book.catches[0]!, id: "old", caughtAt: new Date(2024, 5, 1, 9).toISOString() };
    expect(yearTally([...book.catches, old])).toEqual([
      { year: "2026", count: book.catches.length },
      { year: "2024", count: 1 },
    ]);
  });
});

describe("days out", () => {
  it("counts each day with a fish or a fished outing once, and not outings still to come", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const today = "2026-10-15";
    const days = new Set([...book.catches.map((entry) => localDate(new Date(entry.caughtAt))), ...book.trips.filter((trip) => trip.date <= today).map((trip) => trip.date)]);
    expect(daysOut(book, "2026", today)).toBe([...days].filter((day) => day.startsWith("2026-")).length);
    expect(daysOut({ ...book, trips: [...book.trips, { ...book.trips[0]!, id: "later", date: "2026-12-01" }] }, "2026", today)).toBe(daysOut(book, "2026", today));
    expect(daysOut(book, "2020", today)).toBe(0);
  });
});
