import { describe, expect, it } from "vitest";
import { localDate, recentTrips, sampleLogbook } from "@stillwater/shared";
import { bestFishDay, catchMonth, daysOut, monthTally, tripsByMonth, yearTally } from "./tripMonths";

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

  it("keeps a month with no fish between, and reaches back to the same month a year ago", () => {
    const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
    const at = (y: number, m: number) => ({ ...base, id: `${y}-${m}`, caughtAt: new Date(y, m, 10, 9).toISOString() });
    const rows = monthTally([at(2026, 9), at(2026, 7), at(2025, 9), at(2024, 1)]);
    expect(rows.length).toBe(13);
    expect(rows[0]).toEqual({ month: "2026-10", count: 1 });
    expect(rows[1]).toEqual({ month: "2026-09", count: 0 });
    expect(rows[12]).toEqual({ month: "2025-10", count: 1 });
    expect(monthTally([at(2026, 9), at(2026, 7)]).map((row) => row.month)).toEqual(["2026-10", "2026-09", "2026-08"]);
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
    const days = new Set([...book.catches.map((entry) => localDate(new Date(entry.caughtAt))), ...book.trips.filter((trip) => trip.date < today).map((trip) => trip.date)]);
    expect(daysOut(book, "2026", today)).toBe([...days].filter((day) => day.startsWith("2026-")).length);
    expect(daysOut({ ...book, trips: [...book.trips, { ...book.trips[0]!, id: "later", date: "2026-12-01" }] }, "2026", today)).toBe(daysOut(book, "2026", today));
    // A fish just after midnight on an evening outing is the same day out.
    const evening = { id: "eve", date: "2026-07-03", spotId: book.spots[0]!.id, title: "Evening", note: "" };
    const late = { ...book.catches[0]!, id: "late", tripId: "eve", caughtAt: new Date(2026, 6, 4, 0, 30).toISOString() };
    expect(daysOut({ ...book, trips: [evening], catches: [late] }, "2026", today)).toBe(1);
    expect(daysOut(book, "2020", today)).toBe(0);
  });
});

describe("the best fish day", () => {
  it("counts a night session's small hours on its outing's day and opens that outing", () => {
    const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
    const trip = { id: "zq-night", date: "2026-10-17", spotId: "lake", title: "", note: "" };
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();
    const catches = [
      { ...base, id: "a", tripId: trip.id, caughtAt: at(17, 18) },
      { ...base, id: "b", tripId: trip.id, caughtAt: at(17, 21) },
      { ...base, id: "c", tripId: trip.id, caughtAt: at(18, 0) },
      { ...base, id: "d", tripId: null, caughtAt: at(12, 9) },
      { ...base, id: "e", tripId: null, caughtAt: at(12, 10) },
    ];
    expect(bestFishDay({ spots: [], trips: [trip], catches })).toEqual({ date: "2026-10-17", count: 3, tripId: trip.id });
  });
});
