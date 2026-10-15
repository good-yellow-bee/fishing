import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { bookLures, lastMeasureKind, ownFirst, startTimeFor, tripLure, tripOnDay, tripWeather, lastReleased, speciesBestSoFar } from "./suggestions";

describe("suggest the player's own names first", () => {
  it("puts own names first and drops repeats whatever their case", () => {
    expect(ownFirst(["Green tube", "Bobber"], ["bobber", "Spinner", "green Tube", "Jig"])).toEqual(["Green tube", "Bobber", "Spinner", "Jig"]);
  });

  it("shows names in the reader's language before comparing them", () => {
    const pl: Record<string, string> = { Bobber: "Spławik" };
    expect(ownFirst(["Spławik"], ["Bobber", "Jig"], (name) => pl[name] ?? name)).toEqual(["Spławik", "Jig"]);
  });

  it("knows the book's lures and the last lure used on a trip", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    expect(bookLures(book).length).toBeGreaterThan(0);
    const newest = [...book.catches].filter((entry) => entry.tripId).sort((a, b) => b.caughtAt.localeCompare(a.caughtAt))[0]!;
    expect(tripLure(book, newest.tripId!)).toBe(newest.lure);
    expect(tripLure(book, undefined)).toBe("");
  });

  it("offers the newest noted weather on a trip, never the fish being edited", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    const onTrip = [...book.catches]
      .filter((entry) => entry.tripId && entry.weather)
      .sort((a, b) => b.caughtAt.localeCompare(a.caughtAt));
    const newest = onTrip[0]!;
    expect(tripWeather(book, newest.tripId!)).toEqual(newest.weather);
    const second = onTrip.find((entry) => entry.tripId === newest.tripId && entry.id !== newest.id);
    expect(tripWeather(book, newest.tripId!, newest.id)).toEqual(second?.weather ?? null);
    expect(tripWeather(book, undefined)).toBeNull();
    expect(tripWeather({ ...book, catches: book.catches.map((entry) => ({ ...entry, weather: null })) }, newest.tripId!)).toBeNull();
  });
});

describe("the measure a new catch starts with", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const fish = (id: string, kind: "length" | "weight", caughtAt: string, spotId = "spot-mill") => ({
    ...book.catches[0]!,
    id,
    spotId,
    caughtAt,
    measure: kind === "length" ? { kind, inches: 12 } : { kind, pounds: 2 },
  });

  it("starts with length when the player has logged nothing by hand", () => {
    expect(lastMeasureKind(book)).toBe("length");
    expect(lastMeasureKind({ ...book, catches: [...book.catches, fish("game", "weight", "2026-10-20T08:00:00", "spot-stillwater")] })).toBe("length");
  });

  it("follows the player's newest fish logged by hand", () => {
    const own = { ...book, catches: [...book.catches, fish("old", "length", "2026-10-18T08:00:00"), fish("new", "weight", "2026-10-19T08:00:00")] };
    expect(lastMeasureKind(own)).toBe("weight");
  });

  it("starts ticked as released only when the player's newest own fish went back", () => {
    expect(lastReleased(book)).toBe(false);
    const back = { ...fish("new", "length", "2026-10-19T08:00:00"), released: true };
    expect(lastReleased({ ...book, catches: [...book.catches, back] })).toBe(true);
    const kept = fish("newer", "length", "2026-10-20T08:00:00");
    expect(lastReleased({ ...book, catches: [...book.catches, back, kept] })).toBe(false);
    const lake = { ...fish("game", "weight", "2026-10-21T08:00:00", "spot-stillwater"), released: false };
    expect(lastReleased({ ...book, catches: [...book.catches, back, lake] })).toBe(true);
  });
});

describe("the biggest of the kind being typed", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));

  it("finds the longest and heaviest of the kind, whatever the case or language", () => {
    const pike = speciesBestSoFar(book, " northern PIKE ");
    expect(pike?.longest?.id).toBe("catch-pike-mepps");
    expect(pike?.heaviest?.id).toBe("catch-pike-spin");
    const pl: Record<string, string> = { "Northern pike": "Szczupak" };
    expect(speciesBestSoFar(book, "szczupak", (name) => pl[name] ?? name)?.heaviest?.id).toBe("catch-pike-spin");
  });

  it("says nothing for a blank or new kind, or when the only fish is the one being edited", () => {
    expect(speciesBestSoFar(book, "")).toBeNull();
    expect(speciesBestSoFar(book, "Swordfish")).toBeNull();
    const pike = speciesBestSoFar(book, "Northern pike", undefined, "catch-pike-spin");
    expect(pike?.heaviest).toBeNull();
    expect(pike?.longest?.id).toBe("catch-pike-mepps");
  });
});

describe("when a new catch starts", () => {
  const now = new Date(2026, 9, 15, 7, 42);

  it("starts now without an outing, or for one today or ahead", () => {
    expect(startTimeFor(undefined, now)).toBe(now);
    expect(startTimeFor({ date: "2026-10-15" }, now)).toBe(now);
    expect(startTimeFor({ date: "2026-10-20" }, now)).toBe(now);
  });

  it("starts on an earlier outing's day at this clock time", () => {
    expect(startTimeFor({ date: "2026-10-12" }, now)).toEqual(new Date(2026, 9, 12, 7, 42));
  });
});

describe("the outing a new catch files under", () => {
  it("finds the trip on that water that day, and nothing on another day or water", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const trip = book.trips[0]!;
    expect(tripOnDay(book, trip.spotId, trip.date)?.id).toBe(trip.id);
    expect(tripOnDay(book, trip.spotId, "1999-01-01")).toBeUndefined();
    expect(tripOnDay(book, "no-such-water", trip.date)).toBeUndefined();
  });
});
