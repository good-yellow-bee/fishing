import { describe, expect, it } from "vitest";
import { parseSizeQuery, sizeMatches } from "./sizeQuery";

describe("size queries", () => {
  it("reads a bound in pounds, ounces, kilograms, inches or centimetres", () => {
    expect(parseSizeQuery(">2 lb")).toEqual({ kind: "weight", over: true, amount: 2 });
    expect(parseSizeQuery("<12in")).toEqual({ kind: "length", over: false, amount: 12 });
    expect(parseSizeQuery(">= 1,5 kg")?.amount).toBeCloseTo(3.307, 2);
    expect(parseSizeQuery("> 30 cm")?.amount).toBeCloseTo(11.81, 1);
  });

  it("leaves ordinary words and unknown units alone", () => {
    expect(parseSizeQuery("pike")).toBeNull();
    expect(parseSizeQuery(">2")).toBeNull();
    expect(parseSizeQuery(">2 miles")).toBeNull();
  });

  it("matches only fish measured the same way, on the asked side", () => {
    const over = parseSizeQuery(">2 lb")!;
    expect(sizeMatches({ kind: "weight", pounds: 2.4 }, over)).toBe(true);
    expect(sizeMatches({ kind: "weight", pounds: 1.9 }, over)).toBe(false);
    expect(sizeMatches({ kind: "length", inches: 30 }, over)).toBe(false);
    expect(sizeMatches({ kind: "length", inches: 10 }, parseSizeQuery("<12 in")!)).toBe(true);
  });
});
