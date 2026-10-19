import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { pieceRecords } from "./gear/pieceRecord";

describe("round 103 ideas: when a lure that never took a fish last went out", () => {
  it("is the newest outing it was packed for", () => {
    const trip = (id: string, date: string) => ({ id, date, spotId: "own", title: "", note: "" });
    const book: Logbook = { spots: [], trips: [trip("a", "2026-09-01"), trip("b", "2026-10-05"), trip("c", "2026-10-30")], catches: [] };
    const items = ["a", "b", "c"].map((tripId) => ({ id: `i-${tripId}`, tripId, label: "Popper", packed: true }));
    // The outing still ahead is no outing gone without a fish.
    expect(pieceRecords(book, items, "2026-10-19")[0]).toMatchObject({ name: "Popper", outings: 2, fish: 0, lastPacked: "2026-10-05" });
  });
});
