import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { looksLikeOtherMeasure } from "./suggestions";

describe("looksLikeOtherMeasure", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const pike = (inches: number, pounds: number): CatchEntry => ({
    ...base,
    measure: { kind: "length", inches },
    alsoMeasure: { kind: "weight", pounds },
  });
  const best = { longest: pike(30, 8), heaviest: pike(30, 8) };

  it("flags a weight far past the best that fits as a length", () => {
    expect(looksLikeOtherMeasure(best, "weight", 41, 41)).toBe(true);
    expect(looksLikeOtherMeasure(best, "weight", 12, 12)).toBe(false);
  });

  it("leaves a number too big for either measure, or a kind with no best yet", () => {
    expect(looksLikeOtherMeasure(best, "weight", 200, 200)).toBe(false);
    expect(looksLikeOtherMeasure(null, "weight", 41, 41)).toBe(false);
    expect(looksLikeOtherMeasure(best, "length", 0, 0)).toBe(false);
  });

  it("flags a length when the kind has no weight to compare with", () => {
    const lengthOnly = { longest: { ...base, measure: { kind: "length" as const, inches: 10 }, alsoMeasure: undefined }, heaviest: null };
    expect(looksLikeOtherMeasure(lengthOnly, "length", 25, 25)).toBe(true);
  });
});
