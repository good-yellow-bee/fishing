import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { onPiece, pieceTally } from "./pieceTally";

describe("round 113 ideas: a search split by lure", () => {
  it("takes a lure however written as one entry that opens all of it", () => {
    const fish = (id: string, lure: string): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure, spotId: "a", tripId: null, caughtAt: "2026-10-12T08:00:00.000Z", note: "", weather: null });
    const catches = [fish("1", "Spinner"), fish("2", "spinners"), fish("3", "Worm")];
    const rows = pieceTally(catches, Infinity);
    expect(rows.map((row) => row.count)).toEqual([2, 1]);
    expect(catches.filter((entry) => onPiece(entry, rows[0]!.lure)).length).toBe(2);
  });
});
