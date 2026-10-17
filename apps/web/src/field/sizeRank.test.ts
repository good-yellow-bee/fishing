import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { biggestSince, sizeRank } from "./sizeRank";

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

describe("biggestSince", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const pike = (id: string, day: number, inches: number): CatchEntry => ({ ...base, id, species: "Northern pike", measure: { kind: "length", inches }, alsoMeasure: undefined, caughtAt: new Date(2026, 5, day).toISOString() });

  it("names the last fish at least as big, once three smaller came between", () => {
    const kind = [pike("big", 1, 30), pike("a", 2, 20), pike("b", 3, 22), pike("c", 4, 21), pike("new", 5, 27)];
    expect(biggestSince(kind, kind[4]!)?.id).toBe("big");
    expect(biggestSince(kind, kind[3]!)).toBeNull();
  });

  it("says nothing for a best at the time", () => {
    const kind = [pike("a", 2, 20), pike("b", 3, 22), pike("c", 4, 21), pike("new", 5, 27)];
    expect(biggestSince(kind, kind[3]!)).toBeNull();
  });
});
