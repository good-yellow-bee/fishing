import { describe, expect, it } from "vitest";
import type { Logbook, Trip } from "@stillwater/shared";
import { findTrips } from "./tripSearch";
import { isPlanned } from "./TripMonthHead";
import { PLAY_LAKE_ID } from "./playLake";

const trip = (spotId: string, date: string) => ({ id: "x", date, spotId, title: "", note: "" }) as Trip;

describe("round 70: what counts as planned", () => {
  it("is an outing still to come, or today's before its first fish", () => {
    expect(isPlanned(trip("own-lake", "2026-10-24"), "2026-10-18", 0)).toBe(true);
    expect(isPlanned(trip("own-lake", "2026-10-18"), "2026-10-18", 0)).toBe(true);
    expect(isPlanned(trip("own-lake", "2026-10-18"), "2026-10-18", 1)).toBe(false);
    expect(isPlanned(trip("own-lake", "2026-10-17"), "2026-10-18", 0)).toBe(false);
  });

  it("is never a round of the game, which is made by playing", () => {
    expect(isPlanned(trip(PLAY_LAKE_ID, "2026-10-18"), "2026-10-18", 0)).toBe(false);
  });
});

describe("round 70 ideas: planned in the outing search", () => {
  it("finds outings ahead and today's before its first fish", () => {
    const book = {
      spots: [{ id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }],
      trips: [
        { id: "a", date: "2026-10-24", spotId: "own-lake", title: "", note: "" },
        { id: "b", date: "2026-10-18", spotId: "own-lake", title: "", note: "" },
        { id: "c", date: "2026-10-18", spotId: "own-lake", title: "", note: "" },
        { id: "d", date: "2026-10-10", spotId: "own-lake", title: "", note: "" },
      ],
      catches: [],
    } as unknown as Logbook;
    const fishOn = (id: string) => (id === "c" ? 1 : 0);
    const ids = (needle: string) => findTrips(book, needle, fishOn, "2026-10-18", (s: string) => s, new Date(2026, 9, 18, 10)).map((trip) => trip.id).sort();
    expect(ids("planned")).toEqual(["a", "b"]);
    expect(ids("zaplanowane")).toEqual(["a", "b"]);
  });
});
