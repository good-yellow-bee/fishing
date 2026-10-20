import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { isPlanned } from "./TripMonthHead";
import { lastOutingBefore } from "./outingAverage";
import { newestOutingFirst } from "./catchNeighbors";
import { underWay } from "./tripDates";
import { findTrips } from "./tripSearch";

const spot = { id: "a", name: "Pine Pond", waterType: "pond" as const, notes: "", bestConditions: "" };
const trip = (id: string, date: string): Trip => ({ id, date, spotId: "a", title: "", note: "" });
const fish = (id: string, tripId: string | null, at: Date): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "a", tripId, caughtAt: at.toISOString(), note: "", weather: null });

afterEach(() => vi.useRealTimers());

describe("round 112: last evening's blank outing that gave way to today's plan", () => {
  it("is no longer planned at 02:00", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 2, 0));
    const book: Logbook = { spots: [spot], trips: [trip("eve", "2026-10-19"), trip("dawn", "2026-10-20")], catches: [] };
    expect(isPlanned(book.trips[0]!, "2026-10-20", 0, book)).toBe(false);
    expect(isPlanned(book.trips[1]!, "2026-10-20", 0, book)).toBe(true);
    const alone: Logbook = { ...book, trips: [book.trips[0]!] };
    expect(isPlanned(alone.trips[0]!, "2026-10-20", 0, alone)).toBe(true);
  });
});

describe("round 112: a small-hours loose fish", () => {
  it("keeps to last evening's session, not this morning's plan", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 1, 0));
    const book: Logbook = {
      spots: [spot],
      trips: [trip("eve", "2026-10-19"), trip("dawn", "2026-10-20")],
      catches: [fish("e", "eve", new Date(2026, 9, 19, 21, 30)), fish("n", null, new Date(2026, 9, 20, 0, 30))],
    };
    expect(underWay(book, book.trips[1]!)).toBe(false);
  });
});

describe("round 112: a day's dawn and dusk", () => {
  const book: Logbook = {
    spots: [spot],
    trips: [trip("dawn", "2026-10-18"), trip("dusk", "2026-10-18")],
    catches: [fish("d1", "dawn", new Date(2026, 9, 18, 6, 0)), fish("d2", "dusk", new Date(2026, 9, 18, 19, 0))],
  };
  it("name the dusk as last time here", () => {
    expect(lastOutingBefore(book.trips, "2026-10-25", "2026-10-20", () => 1, newestOutingFirst(book))?.id).toBe("dusk");
  });
  it("list the dusk first in a search", () => {
    expect(findTrips(book, "pine", () => 1, "2026-10-20", (text) => text).map((found) => found.id)).toEqual(["dusk", "dawn"]);
  });
});
