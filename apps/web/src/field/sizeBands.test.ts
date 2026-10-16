import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { sizeBands } from "./sizeBands";

describe("size bands on a species page", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const long = (id: string, inches: number): CatchEntry => ({ ...base, id, measure: { kind: "length", inches }, alsoMeasure: undefined });

  it("spreads the fish over round bands, a fish on an edge going to the upper one", () => {
    const bands = sizeBands([long("a", 18), long("b", 20), long("c", 21.5), long("d", 26)], "length", false);
    expect(bands.map((band) => [band.from, band.to, band.count])).toEqual([
      [18, 20, 1],
      [20, 22, 2],
      [22, 24, 0],
      [24, 26, 0],
      [26, 28, 1],
    ]);
    expect(bands[1]!.search).toBe(">20 in + <22 in");
  });

  it("works in centimetres for a metric reader", () => {
    const bands = sizeBands([long("a", 18), long("b", 20), long("c", 21.5), long("d", 26)], "length", true);
    expect(bands[0]!.unit).toBe("cm");
    expect(bands.reduce((sum, band) => sum + band.count, 0)).toBe(4);
  });

  it("says nothing for a few fish, or when they all share a band", () => {
    expect(sizeBands([long("a", 18), long("b", 20), long("c", 21)], "length", false)).toEqual([]);
    expect(sizeBands([long("a", 20), long("b", 20.2), long("c", 20.5), long("d", 20.9)], "length", false)).toEqual([]);
    expect(sizeBands([long("a", 20), long("b", 22), long("c", 24), long("d", 26)], "weight", false)).toEqual([]);
  });
});
