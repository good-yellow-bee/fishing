import { describe, expect, it } from "vitest";
import { parseSizeQuery, parseTempQuery, sizeMatches, tempMatches } from "./sizeQuery";
import { tempBandSearch } from "./WeatherBars";

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

describe("water-temperature queries", () => {
  it("reads a bound in °F or °C, with or without the degree sign", () => {
    expect(parseTempQuery(">60°F")).toEqual({ over: true, fahrenheit: 60 });
    expect(parseTempQuery("< 15 °C")).toEqual({ over: false, fahrenheit: 59 });
    expect(parseTempQuery(">=10,5c")?.fahrenheit).toBeCloseTo(50.9, 5);
    expect(parseTempQuery(">2 lb")).toBeNull();
    expect(parseTempQuery("60F")).toBeNull();
  });

  it("puts a fish on an edge in the warmer band, as the bars count it", () => {
    const [cold, cool] = [parseTempQuery("<50°F")!, parseTempQuery(">50°F")!];
    expect(tempMatches(50, cold)).toBe(false);
    expect(tempMatches(50, cool)).toBe(true);
    expect(tempMatches(49.9, cold)).toBe(true);
    expect(tempMatches(undefined, cool)).toBe(false);
    expect(tempBandSearch({ from: 50, to: 60, count: 1 })).toBe(">50°F + <60°F");
    expect(tempBandSearch({ from: null, to: 50, count: 1 })).toBe("<50°F");
  });
});
