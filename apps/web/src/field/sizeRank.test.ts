import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { setUnits } from "../i18n";
import { biggestSince, forItsLength, sizeRank } from "./sizeRank";

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

  it("compares sizes as they read", () => {
    setUnits("metric");
    // 23.9 in and 24.0 in both read 61 cm: the newer is as big as that one, not the biggest since the 30 in fish.
    const kind = [pike("big", 1, 30), pike("near", 2, 23.9), pike("a", 3, 20), pike("b", 4, 20), pike("c", 5, 20), pike("new", 6, 24)];
    expect(biggestSince(kind, kind[5]!)?.id).toBe("near");
    setUnits("imperial");
    expect(biggestSince(kind, kind[5]!)?.id).toBe("big");
  });

  it("compares weights under and over one pound as sizes", () => {
    const gill = (id: string, day: number, pounds: number): CatchEntry => ({ ...base, id, species: "Bluegill", measure: { kind: "weight", pounds }, alsoMeasure: undefined, caughtAt: new Date(2026, 5, day).toISOString() });
    const kind = [gill("small", 1, 0.9), gill("a", 2, 1.2), gill("b", 3, 1.1), gill("c", 4, 1.3), gill("new", 5, 2)];
    expect(biggestSince(kind, kind[4]!)).toBeNull();
  });
});

describe("heavy or light for its length", () => {
  const base = sampleLogbook(new Date(2026, 9, 1)).catches[0]!;
  const fish = (id: string, inches: number, pounds: number): CatchEntry => ({ ...base, id, measure: { kind: "length", inches }, alsoMeasure: { kind: "weight", pounds } });
  // Four fish on one build: pounds = 0.0004 * inches^3.
  const kind = [fish("a", 20, 3.2), fish("b", 25, 6.25), fish("c", 30, 10.8), fish("d", 15, 1.35)];

  it("says a fat fish is heavy and a thin one light, with the usual weight", () => {
    const fat = forItsLength(kind, fish("x", 25, 8));
    expect(fat?.heavy).toBe(true);
    expect(fat?.usual).toBeCloseTo(6.25, 2);
    expect(forItsLength(kind, fish("y", 25, 5))?.heavy).toBe(false);
  });

  it("says nothing for a usual fish, one not weighed, or too few to go by", () => {
    expect(forItsLength(kind, fish("z", 25, 6.5))).toBeNull();
    expect(forItsLength(kind, { ...base, id: "w", measure: { kind: "length", inches: 25 }, alsoMeasure: undefined })).toBeNull();
    expect(forItsLength(kind.slice(0, 2), fish("x", 25, 8))).toBeNull();
  });
});
