import { describe, expect, it } from "vitest";
import { localDate, sampleLogbook } from "@stillwater/shared";
import { fullSpecies, bookLures, dayWeather, kindMeasure, lastMeasureKind, ownFirst, fishOnOutingDay, startTimeFor, tripForFish, tripLure, tripOnDay, tripWeather, lastReleased, speciesBestSoFar } from "./suggestions";

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

  it("follows how the player last measured the kind typed", () => {
    const panfish = (id: string, kind: "length" | "weight", caughtAt: string, spotId?: string) => ({ ...fish(id, kind, caughtAt, spotId), species: "Bluegill" });
    const own = { ...book, catches: [...book.catches, panfish("a", "length", "2026-10-10T08:00:00"), panfish("b", "weight", "2026-10-12T08:00:00"), panfish("g", "length", "2026-10-13T08:00:00", "spot-stillwater")] };
    expect(kindMeasure(own, "bluegill")).toBe("weight");
    expect(kindMeasure(own, "Walleye")).toBeNull();
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

  it("keeps now in the small hours for last night's outing", () => {
    const late = new Date(2026, 9, 16, 1, 20);
    expect(startTimeFor({ date: "2026-10-15" }, late)).toBe(late);
    expect(startTimeFor({ date: "2026-10-14" }, late)).toEqual(new Date(2026, 9, 14, 1, 20));
  });

  it("keeps now past the small hours while the outing's fish are still coming in", () => {
    const dawn = new Date(2026, 9, 16, 4, 30);
    const lastFish = new Date(2026, 9, 16, 4, 20).toISOString();
    expect(startTimeFor({ date: "2026-10-15" }, dawn, lastFish)).toBe(dawn);
    // Written up the next morning, hours after the last fish: back on the outing's day.
    const morning = new Date(2026, 9, 16, 11, 0);
    expect(startTimeFor({ date: "2026-10-15" }, morning, lastFish)).toEqual(new Date(2026, 9, 15, 11, 0));
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

  it("counts a loose fish from the small hours for the evening before, unless that day has its own outing", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const only = { ...book, trips: [{ id: "eve", date: "2026-10-03", spotId: "w", title: "Evening", note: "" }] };
    expect(fishOnOutingDay(only, "w", "2026-10-03T21:00", "2026-10-03")).toBe(true);
    expect(fishOnOutingDay(only, "w", "2026-10-04T01:30", "2026-10-03")).toBe(true);
    expect(fishOnOutingDay(only, "w", "2026-10-04T05:00", "2026-10-03")).toBe(false);
    const both = { ...only, trips: [...only.trips, { id: "dawn", date: "2026-10-04", spotId: "w", title: "Dawn", note: "" }] };
    expect(fishOnOutingDay(both, "w", "2026-10-04T01:30", "2026-10-03")).toBe(false);
  });

  it("files a fish from the small hours under the evening before's outing", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const trip = { ...book.trips[0]!, id: "own-evening" };
    const [y, m, d] = trip.date.split("-").map(Number) as [number, number, number];
    const next = new Date(y, m - 1, d + 1, 12);
    const nextDay = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    const only = { ...book, trips: [trip] };
    expect(tripForFish(only, trip.spotId, `${trip.date}T18:00`)?.id).toBe(trip.id);
    expect(tripForFish(only, trip.spotId, `${nextDay}T01:30`)?.id).toBe(trip.id);
    expect(tripForFish(only, trip.spotId, `${nextDay}T04:00`)).toBeUndefined();
    expect(tripForFish(only, trip.spotId, nextDay)).toBeUndefined();
    const morning = { ...trip, id: "next-morning", date: nextDay };
    expect(tripForFish({ ...book, trips: [trip, morning] }, trip.spotId, `${nextDay}T01:30`)?.id).toBe("next-morning");
  });

  it("never files a new fish on one of the sample week's outings", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const trip = book.trips[0]!;
    expect(tripForFish(book, trip.spotId, `${trip.date}T10:00`)).toBeUndefined();
  });
});

describe("weather from the same day", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const base = book.catches.find((entry) => entry.weather)!;
  const morning = { ...base, id: "m", caughtAt: new Date(2026, 9, 10, 9, 0).toISOString(), weather: { sky: "fog" as const, wind: "calm" as const, waterTempF: 50 } };
  const noon = { ...base, id: "n", caughtAt: new Date(2026, 9, 10, 12, 0).toISOString(), weather: { sky: "clear" as const, wind: "calm" as const, waterTempF: 55 } };
  const day = { ...book, catches: [morning, noon] };

  it("offers the newest same-day fish's weather", () => {
    expect(dayWeather(day, "2026-10-10")).toEqual(noon.weather);
    expect(dayWeather(day, "2026-10-10", "n")).toEqual(morning.weather);
  });

  it("brings the water temperature only from a fish on the same water", () => {
    expect(dayWeather(day, "2026-10-10", undefined, base.spotId)).toEqual(noon.weather);
    expect(dayWeather(day, "2026-10-10", undefined, "another-water")).toEqual({ sky: "clear", wind: "calm" });
  });

  it("never offers the game's made-up sky", () => {
    const played = { ...noon, id: "g", spotId: "spot-stillwater", caughtAt: new Date(2026, 9, 10, 15, 0).toISOString(), weather: { sky: "rain" as const, wind: "strong" as const } };
    expect(dayWeather({ ...book, catches: [morning, noon, played] }, "2026-10-10", undefined, "another-water")).toEqual({ sky: "clear", wind: "calm" });
  });

  it("never offers the sample week's invented weather", () => {
    const sample = book.catches.find((entry) => entry.weather)!;
    expect(dayWeather(book, localDate(new Date(sample.caughtAt)))).toBeNull();
  });

  it("offers nothing for a day with no fish or a half-typed day", () => {
    expect(dayWeather(day, "2026-10-11")).toBeNull();
    expect(dayWeather(day, "2026-10")).toBeNull();
  });
});

describe("a short species name", () => {
  it("offers the full name it ends, the book's own first", () => {
    expect(fullSpecies("perch", ["European perch", "Yellow perch"])).toBe("European perch");
    expect(fullSpecies(" Pike ", ["Northern pike"])).toBe("Northern pike");
    expect(fullSpecies("perch", ["Perch", "Yellow perch"])).toBeNull();
    expect(fullSpecies("ch", ["Yellow perch"])).toBeNull();
  });
});
