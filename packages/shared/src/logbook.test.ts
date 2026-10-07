import { describe, expect, it } from "vitest";
import {
  catchesForTrip,
  formatMeasure,
  isLogbook,
  keepLandedCatch,
  localDate,
  parseCatchDraft,
  parseSpotDraft,
  parseTripDraft,
  recentCatches,
  recentTrips,
  replaceCatch,
  replaceSpot,
  replaceTrip,
  sampleLogbook,
  upcomingTrips,
  withoutCatch,
  withoutSpot,
  withoutTrip,
  type CatchDraft,
  type Logbook,
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
    sky: "overcast",
    wind: "light-west",
    waterTemp: "58",
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

  it("rewrites one catch and keeps the rest", () => {
    const parsed = parseCatchDraft(draft("spot-cedar", { species: "Tiger muskie", amount: "34", lure: "Spoon" }), book);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const next = replaceCatch(book, { ...parsed.value, id: "catch-pike-mepps" });
    expect(next.catches).toHaveLength(book.catches.length);
    expect(next.catches.find((entry) => entry.id === "catch-pike-mepps")).toMatchObject({
      species: "Tiger muskie",
      lure: "Spoon",
      spotId: "spot-cedar",
    });
  });

  it("renames a spot without moving its outings", () => {
    const parsed = parseSpotDraft({
      name: "Cedar Point",
      waterType: "lake",
      notes: "Same shelf.",
      bestConditions: "Overcast",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const next = replaceSpot(book, { ...parsed.value, id: "spot-cedar" });
    expect(next.spots).toHaveLength(book.spots.length);
    expect(next.spots.find((spot) => spot.id === "spot-cedar")?.name).toBe("Cedar Point");
    expect(next.trips.filter((trip) => trip.spotId === "spot-cedar")).toHaveLength(2);
  });

  it("moves fish with an outing when that outing changes water", () => {
    const parsed = parseTripDraft(
      { date: "2026-09-25", spotId: "spot-cedar", title: "Moved", note: "Same fish." },
      book,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const next = replaceTrip(book, { ...parsed.value, id: "trip-mill" });
    const fish = next.catches.filter((entry) => entry.tripId === "trip-mill");
    expect(fish).toHaveLength(2);
    expect(fish.every((entry) => entry.spotId === "spot-cedar")).toBe(true);
    expect(next.trips.find((trip) => trip.id === "trip-mill")?.title).toBe("Moved");
  });

  it("drops one fish", () => {
    const next = withoutCatch(book, "catch-gill");
    expect(next.catches.some((entry) => entry.id === "catch-gill")).toBe(false);
    expect(next.catches).toHaveLength(book.catches.length - 1);
    expect(isLogbook(next)).toBe(true);
  });

  it("clears a deleted outing from its fish", () => {
    const next = withoutTrip(book, "trip-mill");
    expect(next.trips.some((trip) => trip.id === "trip-mill")).toBe(false);
    const fish = next.catches.filter((entry) => entry.id === "catch-brook-bugger" || entry.id === "catch-brook-nymph");
    expect(fish).toHaveLength(2);
    expect(fish.every((entry) => entry.tripId === null && entry.spotId === "spot-mill" && entry.weather)).toBe(true);
    expect(next.catches).toHaveLength(book.catches.length);
    expect(isLogbook(next)).toBe(true);
  });

  it("removes a spot along with the outings and fish that need it", () => {
    const next = withoutSpot(book, "spot-duck");
    expect(next.spots.some((spot) => spot.id === "spot-duck")).toBe(false);
    expect(next.trips.some((trip) => trip.id === "trip-duck" || trip.spotId === "spot-duck")).toBe(false);
    expect(next.catches.some((entry) => entry.spotId === "spot-duck" || entry.tripId === "trip-duck")).toBe(false);
    expect(next.catches).toHaveLength(book.catches.length - 2);
    expect(next.trips).toHaveLength(book.trips.length - 1);
    expect(isLogbook(next)).toBe(true);
  });

  it("keeps a landed fish on the lake already in the book", () => {
    const next = keepLandedCatch(book, {
      id: "catch-play-gill",
      species: "Bluegill",
      pounds: 0.4,
      bank: "dock",
      caughtAt: "2026-10-07T18:04:00.000Z",
    });
    const kept = next.catches.find((entry) => entry.id === "catch-play-gill");
    expect(next.spots).toEqual(book.spots);
    expect(next.catches).toHaveLength(book.catches.length + 1);
    expect(kept).toEqual({
      id: "catch-play-gill",
      species: "Bluegill",
      measure: { kind: "weight", pounds: 0.4 },
      lure: "Bobber",
      spotId: "spot-cedar",
      tripId: null,
      caughtAt: "2026-10-07T18:04:00.000Z",
      note: "Landed at the dock.",
      weather: null,
    });
    expect(isLogbook(next)).toBe(true);
    expect(keepLandedCatch(next, {
      id: "catch-play-gill",
      species: "Bluegill",
      pounds: 0.4,
      bank: "dock",
      caughtAt: "2026-10-07T18:04:00.000Z",
    })).toBe(next);
  });

  it("adds this lake when the book has no lake spot", () => {
    const river: Logbook = {
      spots: [
        {
          id: "spot-mill",
          name: "Mill Race",
          waterType: "river",
          notes: "",
          bestConditions: "",
        },
      ],
      trips: [],
      catches: [],
    };
    const next = keepLandedCatch(river, {
      id: "catch-play-perch",
      species: "Yellow perch",
      pounds: 0.8,
      bank: "Drop-off",
      caughtAt: "2026-10-07T18:10:00.000Z",
    });
    expect(next.spots.map((spot) => spot.id)).toEqual(["spot-mill", "spot-stillwater"]);
    expect(next.spots[1]).toMatchObject({ name: "Stillwater", waterType: "lake" });
    expect(next.catches[0]).toMatchObject({
      species: "Yellow perch",
      measure: { kind: "weight", pounds: 0.8 },
      spotId: "spot-stillwater",
      note: "Landed at the drop-off.",
      weather: null,
    });
    expect(isLogbook(next)).toBe(true);
  });
});
