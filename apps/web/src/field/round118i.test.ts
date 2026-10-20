import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook, type Spot, type Trip } from "@stillwater/shared";
import { outingFish, underWayOn } from "./outingFish";
import { averagedOutings, placeOnWater } from "./TripPages";

const TODAY = "2026-10-15";
const water = (id: string) => ({ id, name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, more: Partial<Trip> = {}): Trip => ({ id, date, spotId: "own", title: "", note: "", ...more }) as Trip;
const fish = (id: string, tripId: string | null, hour: number, day = 15): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId: "own", tripId, caughtAt: new Date(2026, 9, day, hour).toISOString(), note: "", weather: null }) as CatchEntry;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 15, 14));
});
afterEach(() => vi.useRealTimers());

describe("round 118 ideas: an outing's page says where it falls among the water's outings", () => {
  const place = (book: Logbook, id: string) => placeOnWater(book, book.trips.find((each) => each.id === id)!, book.trips, TODAY, outingFish(book));

  it("counts the outings fished there, oldest first, a blank and one with a lost fish among them", () => {
    const book: Logbook = {
      spots: [water("own")],
      trips: [trip("c", "2026-10-12"), trip("a", "2026-10-01"), trip("b", "2026-10-05", { lost: 1 }), trip("d", TODAY, { missed: 1 })],
      catches: [fish("1", "a", 8, 1)],
    };
    expect(place(book, "a")).toEqual({ n: 1, total: 4 });
    expect(place(book, "c")).toEqual({ n: 3, total: 4 });
    expect(place(book, "d")).toEqual({ n: 4, total: 4 });
  });

  it("leaves the plans out of the count, and says nothing on a plan's own page", () => {
    const book: Logbook = { spots: [water("own")], trips: [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("plan", "2026-10-20"), trip("today", TODAY)], catches: [] };
    expect(place(book, "b")).toEqual({ n: 2, total: 2 });
    expect(place(book, "plan")).toBeNull();
    expect(place(book, "today")).toBeNull();
  });

  it("orders a dawn and a dusk by their fish", () => {
    const book: Logbook = { spots: [water("own")], trips: [trip("dusk", "2026-10-10"), trip("dawn", "2026-10-10")], catches: [fish("1", "dusk", 19, 10), fish("2", "dawn", 6, 10)] };
    expect(place(book, "dawn")).toEqual({ n: 1, total: 2 });
    expect(place(book, "dusk")).toEqual({ n: 2, total: 2 });
  });
});

describe("round 118 ideas: a dawn and a dusk today with a loose fish stay plans on their pages, as on Trips", () => {
  it("credits neither with the loose fish, so neither is under way", () => {
    const book: Logbook = { spots: [water("own")], trips: [trip("old", "2026-10-01"), trip("dawn", TODAY), trip("dusk", TODAY)], catches: [fish("1", null, 9)] };
    const fishOn = outingFish(book);
    expect(fishOn("dawn") + fishOn("dusk")).toBe(0);
    expect(book.trips.filter((each) => underWayOn(each, fishOn)).map((each) => each.id)).toEqual([]);
    expect(placeOnWater(book, book.trips[1]!, book.trips, TODAY, fishOn)).toBeNull();
  });
});

describe("round 118 fixes: Trips' average leaves out the sample week's blank plans that Recent hides", () => {
  it("once the book has a water of the angler's own, with no outing of theirs yet", () => {
    const sample = sampleLogbook(new Date(2026, 9, 5, 12));
    const book: Logbook = { ...sample, spots: [...sample.spots, water("own")] };
    const counted = averagedOutings(book).map((each) => each.id);
    // Planned three days after the sample's day: its day has passed with no fish, a made-up plan, not a blank day.
    expect(counted).not.toContain("trip-quarry-next");
    expect(counted).toContain("trip-mill");
  });
});
