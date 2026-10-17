import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { setUnits } from "../i18n";
import { biggestOnOuting, biggestSince, forItsLength, longGap, sizeRank } from "./sizeRank";

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

  it("goes by the middle build of fish near its length, so one mistyped weight or a far smaller fish doesn't tip it", () => {
    const typo = [...kind, fish("e", 26, 70)];
    expect(forItsLength(typo, fish("z", 25, 6.5))).toBeNull();
    expect(forItsLength([fish("s1", 8, 0.5), fish("s2", 9, 0.7), fish("s3", 10, 0.9)], fish("big", 30, 10.8))).toBeNull();
  });

  it("says nothing for a usual fish, one not weighed, or too few to go by", () => {
    expect(forItsLength(kind, fish("z", 25, 6.5))).toBeNull();
    expect(forItsLength(kind, { ...base, id: "w", measure: { kind: "length", inches: 25 }, alsoMeasure: undefined })).toBeNull();
    expect(forItsLength(kind.slice(0, 2), fish("x", 25, 8))).toBeNull();
  });
});

describe("a long gap since the last of the kind", () => {
  const base = sampleLogbook(new Date(2026, 9, 1)).catches[0]!;
  const at = (id: string, month: number, day: number): CatchEntry => ({ ...base, id, caughtAt: new Date(2026, month, day, 9).toISOString() });
  it("names the one before once 30 days or more went by", () => {
    const kind = [at("a", 4, 1), at("b", 5, 1), at("c", 6, 16)];
    expect(longGap(kind, kind[2]!)).toEqual({ before: kind[1], days: 45 });
    expect(longGap(kind, kind[1]!)).toEqual({ before: kind[0], days: 31 });
  });
  it("counts calendar days, whatever the hours", () => {
    const evening = { ...at("e", 5, 1), caughtAt: new Date(2026, 5, 1, 18).toISOString() };
    const morning = { ...at("m", 6, 1), caughtAt: new Date(2026, 6, 1, 8).toISOString() };
    expect(longGap([evening, morning], morning)?.days).toBe(30);
  });

  it("says nothing for the first of the kind or a short gap", () => {
    const kind = [at("a", 4, 1), at("b", 4, 20)];
    expect(longGap(kind, kind[0]!)).toBeNull();
    expect(longGap(kind, kind[1]!)).toBeNull();
  });
});

describe("biggest of the outing", () => {
  const base = sampleLogbook(new Date(2026, 9, 1)).catches[0]!;
  const fish = (id: string, inches: number): CatchEntry => ({ ...base, id, measure: { kind: "length", inches }, alsoMeasure: undefined });
  it("marks the one the outing's summary names, on an outing of three or more", () => {
    const outing = [fish("a", 12), fish("b", 14), fish("c", 18)];
    expect(biggestOnOuting(outing, outing[2]!)).toBe(true);
    expect(biggestOnOuting(outing, outing[1]!)).toBe(false);
    expect(biggestOnOuting(outing.slice(1), outing[2]!)).toBe(false);
  });

  it("marks only one fish when some were weighed and some measured", () => {
    const weighed = { ...fish("w", 0), measure: { kind: "weight" as const, pounds: 3 } };
    const outing = [fish("a", 12), fish("b", 30), weighed, { ...weighed, id: "w2", measure: { kind: "weight" as const, pounds: 1 } }];
    expect(outing.filter((entry) => biggestOnOuting(outing, entry)).map((entry) => entry.id)).toEqual(["w"]);
  });
});
