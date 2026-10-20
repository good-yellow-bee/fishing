import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { setUnits } from "../i18n";
import { shortOfBest } from "./sizeRank";

const fish = (id: string, inches: number): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches }, lure: "Jig", spotId: "own", tripId: null, caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });

afterEach(() => setUnits("imperial"));

describe("round 107 ideas: how near a fish came to its kind's best", () => {
  const kind = [fish("best", 12), fish("near", 11), fish("far", 9)];

  it("says it within a tenth of the best, opening the best", () => {
    expect(shortOfBest(kind, kind[1]!)).toEqual({ best: kind[0], short: { kind: "length", inches: 1 } });
  });

  it("says nothing for the best, a fish further off, or a tie as it reads", () => {
    expect(shortOfBest(kind, kind[0]!)).toBeNull();
    expect(shortOfBest(kind, kind[2]!)).toBeNull();
    expect(shortOfBest([fish("a", 12), fish("b", 12.02)], fish("a", 12))).toBeNull();
  });
});
