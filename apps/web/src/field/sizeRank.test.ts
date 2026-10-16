import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { sizeRank } from "./sizeRank";

const fish = (id: string, inches: number, pounds?: number): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: { kind: "length", inches },
  ...(pounds ? { alsoMeasure: { kind: "weight" as const, pounds } } : {}),
  lure: "Spoon",
  spotId: "spot-cedar",
  tripId: null,
  caughtAt: "2026-10-10T12:00:00.000Z",
  note: "",
  weather: null,
});

describe("size rank", () => {
  it("counts the others of its kind it outmeasures", () => {
    const kind = [fish("a", 30), fish("b", 22), fish("c", 25), fish("d", 31)];
    expect(sizeRank(kind, kind[0]!)).toBe("Longer than 2 of the 3 others of its kind");
  });

  it("says nothing with too few others or none beaten", () => {
    const kind = [fish("a", 20), fish("b", 22), fish("c", 25), fish("d", 31)];
    expect(sizeRank(kind, kind[0]!)).toBeNull();
    expect(sizeRank(kind.slice(0, 3), kind[2]!)).toBeNull();
  });
});
