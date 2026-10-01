import { describe, expect, it } from "vitest";
import {
  catchesForTrip,
  formatMeasure,
  isLogbook,
  localDate,
  parseCatchDraft,
  parseSpotDraft,
  parseTripDraft,
  recentCatches,
  recentTrips,
  sampleLogbook,
  upcomingTrips,
  type CatchDraft,
} from "./logbook.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);

function draft(bookSpot: string, overrides: Partial<CatchDraft> = {}): CatchDraft {
  return {
    species: "Yellow perch",
    measureKind: "length",
    amount: "11",
    lure: "Nightcrawler",
    spotId: bookSpot,
    tripId: "",
    caughtAt: "2026-09-28T07:15",
    note: "Short fight.",
    ...overrides,
  };
}

describe("field log", () => {
  const book = sampleLogbook(now);
  const today = localDate(now);

  it("seeds a handful of spots, trips, and catches", () => {
    expect(book.spots).toHaveLength(5);
    expect(book.trips).toHaveLength(7);
    expect(book.catches).toHaveLength(10);
  });

  it("keeps an upcoming outing and recent ones around today", () => {
    const upcoming = upcomingTrips(book, today);
    const recent = recentTrips(book, today);
    expect(upcoming.map((trip) => trip.id)).toEqual(["trip-dawn", "trip-quarry-next"]);
    expect(recent[0]?.id).toBe("trip-mill");
    expect(upcoming.every((trip) => trip.date >= today)).toBe(true);
    expect(recent.every((trip) => trip.date < today)).toBe(true);
  });

  it("links every sample catch to a real spot and outing", () => {
    for (const entry of book.catches) {
      expect(book.spots.some((spot) => spot.id === entry.spotId)).toBe(true);
      expect(entry.tripId).toBeTruthy();
      expect(book.trips.some((trip) => trip.id === entry.tripId && trip.spotId === entry.spotId)).toBe(true);
    }
    expect(catchesForTrip(book, "trip-dawn")).toHaveLength(0);
    expect(catchesForTrip(book, "trip-mill")).toHaveLength(2);
  });

  it("sorts recent catches newest first", () => {
    const rows = recentCatches(book, 4);
    const times = rows.map((row) => row.caughtAt);
    expect(times).toEqual([...times].sort((a, b) => b.localeCompare(a)));
    expect(rows).toHaveLength(4);
    expect(rows[0]?.species).toBe("Brook trout");
  });

  it("formats length and weight without trailing zeros", () => {
    expect(formatMeasure({ kind: "length", inches: 28 })).toBe("28 in");
    expect(formatMeasure({ kind: "length", inches: 16.5 })).toBe("16.5 in");
    expect(formatMeasure({ kind: "weight", pounds: 6.4 })).toBe("6.4 lb");
  });

  it("rejects a catch with no lure and a mismatched outing", () => {
    expect(parseCatchDraft(draft(book.spots[0]!.id, { lure: " " }), book)).toMatchObject({
      ok: false,
      field: "lure",
    });
    expect(parseCatchDraft(draft("spot-mill", { tripId: "trip-dawn" }), book)).toMatchObject({
      ok: false,
      field: "tripId",
    });
  });

  it("accepts length or weight on a known water", () => {
    const length = parseCatchDraft(draft("spot-cedar", { amount: "18.5", lure: "Tube jig" }), book);
    expect(length.ok).toBe(true);
    if (length.ok) {
      expect(length.value.measure).toEqual({ kind: "length", inches: 18.5 });
      expect(length.value.spotId).toBe("spot-cedar");
      expect(length.value.tripId).toBeNull();
    }

    const weight = parseCatchDraft(
      draft("spot-mill", { measureKind: "weight", amount: "1.2", tripId: "trip-mill" }),
      book,
    );
    expect(weight.ok).toBe(true);
    if (weight.ok) {
      expect(weight.value.measure).toEqual({ kind: "weight", pounds: 1.2 });
      expect(weight.value.tripId).toBe("trip-mill");
    }
  });

  it("rejects a time that has not happened yet", () => {
    expect(parseCatchDraft(draft("spot-cedar", { caughtAt: "2999-01-01T08:00" }), book)).toMatchObject({
      ok: false,
      field: "caughtAt",
    });
  });

  it("accepts a new spot and an outing on it", () => {
    const spot = parseSpotDraft({
      name: "  North cove ",
      waterType: "lake",
      notes: "Wind breaks on the point.",
      bestConditions: "East wind",
    });
    expect(spot.ok).toBe(true);
    const trip = parseTripDraft({ date: "2026-10-04", spotId: "spot-quarry", title: "", note: "" }, book);
    expect(trip.ok).toBe(true);
    if (trip.ok) expect(trip.value.title).toBe("Quarry Cut");
  });

  it("rejects a book that is not a book", () => {
    expect(isLogbook(null)).toBe(false);
    expect(isLogbook({ spots: [], trips: [], catches: [] })).toBe(true);
    expect(isLogbook({ spots: [{}], trips: [], catches: [] })).toBe(false);
  });
});
