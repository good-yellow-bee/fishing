import { describe, expect, it } from "vitest";
import { orderedRecords } from "./gear/GearPage";
import type { PieceRecord } from "./gear/pieceRecord";

const row = (label: string, fish: number, outings: number, lastAt?: string): PieceRecord => ({ label, fish, outings, ...(lastAt ? { lastAt } : {}) });

describe("round 67 ideas: the lure record's order", () => {
  const records = [row("Jig", 6, 10, "2026-09-01T10:00:00.000Z"), row("Spoon", 3, 2, "2026-10-12T10:00:00.000Z"), row("Popper", 0, 5), row("Crank", 1, 1, "2026-08-01T10:00:00.000Z")];

  it("keeps most fish first by default", () => {
    expect(orderedRecords(records, "most").map((each) => each.label)).toEqual(["Jig", "Spoon", "Popper", "Crank"]);
  });

  it("puts the most fish an outing first", () => {
    expect(orderedRecords(records, "rate").map((each) => each.label)).toEqual(["Spoon", "Crank", "Jig", "Popper"]);
  });

  it("puts the newest fish first, and a lure that never took one last", () => {
    expect(orderedRecords(records, "latest").map((each) => each.label)).toEqual(["Spoon", "Jig", "Crank", "Popper"]);
  });
});
