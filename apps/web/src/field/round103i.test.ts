import { describe, expect, it } from "vitest";
import { outNow } from "./tripDates";
import type { Logbook } from "@stillwater/shared";
import { pieceRecords } from "./gear/pieceRecord";

describe("round 103 ideas: when a lure that never took a fish last went out", () => {
  it("is the newest outing it was packed for", () => {
    const trip = (id: string, date: string) => ({ id, date, spotId: "own", title: "", note: "" });
    const book: Logbook = { spots: [], trips: [trip("a", "2026-09-01"), trip("b", "2026-10-05"), trip("c", "2026-10-30")], catches: [] };
    // Left unticked on b: on the list, but it stayed home.
    const items = ["a", "b", "c"].map((tripId) => ({ id: `i-${tripId}`, tripId, label: "Popper", packed: tripId !== "b" }));
    // The outing still ahead is no outing gone without a fish.
    expect(pieceRecords(book, items, "2026-10-19")[0]).toMatchObject({ name: "Popper", outings: 2, fish: 0, lastPacked: "2026-09-01" });
  });
});

describe("round 103 ideas: out now", () => {
  const trip = { id: "t", date: "2026-10-19", spotId: "own", title: "", note: "" };
  const fishAt = (at: string): Logbook => ({ spots: [], trips: [trip], catches: [{ id: "f", species: "Pike", measure: { kind: "length", inches: 30 }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: new Date(at).toISOString(), note: "", weather: null }] });

  it("is today's outing for twelve hours after a fish", () => {
    expect(outNow(fishAt("2026-10-19T18:00"), trip, new Date(2026, 9, 19, 23, 0))).toBe(true);
    expect(outNow(fishAt("2026-10-19T05:30"), trip, new Date(2026, 9, 19, 23, 0))).toBe(false);
    expect(outNow({ ...fishAt("2026-10-19T18:00"), catches: [] }, trip, new Date(2026, 9, 19, 23, 0))).toBe(false);
  });
});
