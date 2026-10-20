import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { seasonWaters } from "./seasonWaters";
import { hookTally } from "./hookTally";
import { notesHere } from "./outingNotes";

const water = (id: string, name: string): Spot => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, spotId: string, extra: Partial<Trip> = {}): Trip => ({ id, date, spotId, title: "", note: "", ...extra }) as Trip;
const fish = (id: string, spotId: string, caughtAt: string, tripId: string | null = null): CatchEntry =>
  ({ id, species: "Pike", measure: { kind: "length", inches: 20 }, lure: "Jig", spotId, tripId, caughtAt: new Date(caughtAt).toISOString(), note: "", weather: null }) as CatchEntry;

describe("round 117 fixes: waters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T19:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("counts this season's waters as Trips counts outings, twin waters once", () => {
    const book: Logbook = {
      spots: [water("a", "Śniardwy"), water("b", "Sniardwy"), water("c", "Cedar")],
      trips: [trip("old", "2025-06-01", "a"), trip("new", "2026-06-01", "b"), trip("lost", "2026-10-18", "c", { lost: 1 })],
      catches: [fish("1", "a", "2025-06-01T08:00:00", "old")],
    };
    // Sniardwy is Śniardwy's twin, fished last year: not new. Cedar's only outing today lost a fish: fished, and new.
    expect(seasonWaters(book, "2026-10-18")).toEqual({ fished: 2, first: 1 });
  });

  it("sets a water's landed fish against only those caught there", () => {
    const book: Logbook = {
      spots: [water("a", "Home Lake"), water("b", "Deep Lake")],
      trips: [trip("t", "2026-10-10", "a", { lost: 1 })],
      catches: [fish("1", "a", "2026-10-10T08:00:00", "t"), fish("2", "b", "2026-10-10T10:00:00", "t"), fish("3", "b", "2026-10-10T11:00:00", "t")],
    };
    expect(hookTally(book, "a")).toMatchObject({ landed: 1, lost: 1 });
    expect(hookTally(book)).toMatchObject({ landed: 3, lost: 1 });
  });

  it("takes a note from an outing just after midnight once it has a fish, as the page counts it fished", () => {
    vi.setSystemTime(new Date("2026-10-19T02:00:00"));
    const notes = notesHere([trip("t", "2026-10-19", "a", { note: "Zander on the drop-off" })], "2026-10-18", 3, () => 1);
    expect(notes.map((each) => each.text)).toEqual(["Zander on the drop-off"]);
  });
});

describe("round 117 fixes: an outing with only a lost fish", () => {
  afterEach(() => vi.useRealTimers());

  it("counts in a water's average as a blank", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T19:00:00"));
    const { averageParts } = await import("./outingAverage");
    const trips = [trip("a", "2026-10-10", "w"), trip("b", "2026-10-12", "w"), trip("c", "2026-10-18", "w", { lost: 1 })];
    const fishOn = (id: string) => (id === "c" ? 0 : 6);
    expect(averageParts(trips, fishOn, "2026-10-18")).toEqual({ average: "4 fish an outing on average", blank: "1 without a fish" });
  });
});
