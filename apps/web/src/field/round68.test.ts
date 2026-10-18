import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { seasonRecap } from "./bests/seasonRecap";
import { newWatersThisYear } from "./bests/notYet";
import { seasonFirst, seasonLast } from "./seasonFirst";
import { weekStreak } from "./outingAverage";
import { bookFishDay } from "./tripMonths";

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const trip = (id: string, date: string, spotId = "own-lake"): Trip => ({ id, date, spotId, title: id, note: "" });
const fish = (id: string, caughtAt: string, tripId: string | null, species = "Zander", spotId = "own-lake"): CatchEntry => ({
  id,
  species,
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId,
  tripId,
  caughtAt,
  note: "",
  weather: null,
});

// A New Year's Eve session on a new water, with its only fish in the small hours of 1 January.
const book: Logbook = {
  spots: [],
  trips: [trip("old", "2025-06-01"), trip("nye", "2025-12-31", "east-pond"), trip("spring", "2026-04-02")],
  catches: [
    fish("a", local(2025, 6, 1, 9), "old", "Perch"),
    fish("b", local(2026, 1, 1, 0, 10), "nye", "Pike", "east-pond"),
    fish("c", local(2026, 1, 1, 0, 40), "nye", "Zander", "east-pond"),
    fish("d", local(2026, 4, 2, 8), "spring", "Perch"),
  ],
};
const dayOf = (entry: CatchEntry) => bookFishDay(book, entry);

describe("round 68: a night session's small hours on its outing's day", () => {
  it("counts the season recap as the goal and the calendar do", () => {
    // 2025 by this date holds only June's perch: the night of the 31st is past 18 October.
    const recap = seasonRecap(book, "2026", "2026-10-18");
    expect(recap).toMatchObject({ fish: 1, kinds: 1, fishBefore: 1, newKinds: [] });
    expect(seasonRecap(book, "2025", "2026-10-18").newKinds).toEqual(["Perch", "Pike", "Zander"]);
  });

  it("doesn't call a water new this year for a fish of last year's last night", () => {
    expect(newWatersThisYear(book.catches, new Date(2026, 9, 18))).toEqual(["east-pond"]);
    expect(newWatersThisYear(book.catches, new Date(2026, 9, 18), dayOf)).toEqual([]);
  });

  it("dates a kind's first and last of a year by its outing", () => {
    const zander = [fish("z1", local(2025, 5, 1, 9), null), book.catches[2]!];
    expect(seasonLast(zander, new Date(2026, 9, 18), dayOf)?.id).toBe("c");
    expect(seasonFirst(zander, new Date(2026, 9, 18), dayOf)).toBeNull();
  });
});

describe("round 68: weeks in a row", () => {
  it("leaves today's outing out until it has a fish", () => {
    const trips = [trip("a", "2026-09-30"), trip("b", "2026-10-07"), trip("c", "2026-10-18")];
    expect(weekStreak(trips, "2026-10-18", () => 0).best).toBe(2);
    expect(weekStreak(trips, "2026-10-18", (id) => (id === "c" ? 1 : 0)).best).toBe(3);
  });
});
