import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { outNow, stillGoing } from "./tripDates";

describe("round 105 ideas: out now", () => {
  it("never counts a fish logged ahead of the clock", () => {
    const trip = { id: "t", date: "2026-10-19", spotId: "own", title: "", note: "" };
    const book: Logbook = { spots: [], trips: [trip], catches: [{ id: "f", species: "Pike", measure: { kind: "length", inches: 30 }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: new Date(2026, 9, 19, 23, 30).toISOString(), note: "", weather: null }] };
    expect(outNow(book, trip, new Date(2026, 9, 19, 20, 0))).toBe(false);
    expect(outNow(book, trip, new Date(2026, 9, 19, 23, 45))).toBe(true);
    // In the small hours too, by last evening's outing.
    const ahead = { ...book, catches: book.catches.map((entry) => ({ ...entry, caughtAt: new Date(2026, 9, 20, 3, 0).toISOString() })) };
    expect(stillGoing(ahead, trip, new Date(2026, 9, 20, 1, 0))).toBe(false);
  });
});
