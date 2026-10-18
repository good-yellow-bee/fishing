import { describe, expect, it } from "vitest";
import { sampleLogbook, type Logbook } from "@stillwater/shared";
import { isSampleOuting, ownWatersFirst, upcomingRealTrips, withoutSample } from "./bookCopy";
import { tripNeighbors } from "./catchNeighbors";
import { findTrips } from "./tripSearch";
import { PLAY_LAKE_ID } from "./playLake";

const now = new Date(2026, 9, 18, 10);
const sample = sampleLogbook(now);
const own = { id: "home", name: "Home Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];

describe("round 76: a sample plan moved to the angler's own water becomes theirs", () => {
  const plan = sample.trips.find((trip) => trip.date >= "2026-10-18")!;
  const book = { ...sample, spots: [...sample.spots, own], trips: sample.trips.map((trip) => (trip.id === plan.id ? { ...trip, spotId: "home", date: "2026-10-19", title: "My first outing" } : trip)) };

  it("is planned and kept like any other", () => {
    const moved = book.trips.find((trip) => trip.id === plan.id)!;
    expect(isSampleOuting(moved)).toBe(false);
    expect(upcomingRealTrips(book, "2026-10-18").map((trip) => trip.id)).toEqual([plan.id]);
    expect(withoutSample(book).trips.map((trip) => trip.id)).toContain(plan.id);
  });

  it("leaves the other sample plans out of the steps between outings", () => {
    const hidden = sample.trips.filter((trip) => trip.id !== plan.id && trip.date >= "2026-10-18").map((trip) => trip.id);
    const steps = tripNeighbors(book, plan.id, "2026-10-18");
    expect([steps.newer?.id, steps.older?.id].filter((id) => id && hidden.includes(id))).toEqual([]);
  });
});

describe("round 76: pickers list the angler's own waters first", () => {
  it("puts own, then sample, then the game's lake", () => {
    const play = { ...own, id: PLAY_LAKE_ID, name: "Stillwater" };
    const ids = ownWatersFirst([play, ...sample.spots, own]).map((spot) => spot.id);
    expect(ids[0]).toBe("home");
    expect(ids[ids.length - 1]).toBe(PLAY_LAKE_ID);
  });
});

describe("round 76: the outing search reads a day both ways", () => {
  it("finds last New Year's Eve's outing for “dec 31” in October", () => {
    const book = { spots: [own], trips: [{ id: "nye", date: "2025-12-31", spotId: "home", title: "", note: "" }], catches: [] } as unknown as Logbook;
    expect(findTrips(book, "dec 31", () => 0, "2026-10-18", (text: string) => text, now).map((trip) => trip.id)).toEqual(["nye"]);
  });
});
