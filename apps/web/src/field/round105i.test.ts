import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { outNow } from "./tripDates";

describe("round 105 ideas: out now", () => {
  it("never counts a fish logged ahead of the clock", () => {
    const trip = { id: "t", date: "2026-10-19", spotId: "own", title: "", note: "" };
    const book: Logbook = { spots: [], trips: [trip], catches: [{ id: "f", species: "Pike", measure: { kind: "length", inches: 30 }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: new Date(2026, 9, 19, 23, 30).toISOString(), note: "", weather: null }] };
    expect(outNow(book, trip, new Date(2026, 9, 19, 20, 0))).toBe(false);
    expect(outNow(book, trip, new Date(2026, 9, 19, 23, 45))).toBe(true);
  });
});
