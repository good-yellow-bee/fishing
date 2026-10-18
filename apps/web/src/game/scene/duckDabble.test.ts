import { describe, expect, it } from "vitest";
import { DABBLE_EVERY_SEC, DABBLE_SEC, dabble } from "./duckDabble";

const sample = (phase: number, seconds: number) => Array.from({ length: seconds * 20 }, (_, i) => dabble(i / 20, phase));

describe("a dabbling duck", () => {
  it("up-ends now and then, and spends most of its time afloat", () => {
    const tips = sample(0.37, 600);
    const under = tips.filter((v) => v > 0.9).length / tips.length;
    expect(under).toBeGreaterThan(0.02);
    expect(under).toBeLessThan(0.2);
    expect(tips.filter((v) => v === 0).length / tips.length).toBeGreaterThan(0.75);
  });

  it("tips smoothly, never jumping between afloat and tail up", () => {
    const tips = sample(0.61, 600);
    for (let i = 1; i < tips.length; i += 1) expect(Math.abs(tips[i]! - tips[i - 1]!)).toBeLessThan(0.3);
    for (const v of tips) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("keeps each duck to its own beat, and each dip short", () => {
    const a = sample(0.12, 300);
    const b = sample(0.77, 300);
    expect(a).not.toEqual(b);
    let run = 0;
    let longest = 0;
    for (const v of a) {
      run = v > 0 ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    expect(longest / 20).toBeLessThanOrEqual(DABBLE_SEC);
    expect(DABBLE_EVERY_SEC).toBeGreaterThan(DABBLE_SEC * 4);
  });

  it("stays afloat for reduced motion", () => {
    expect(sample(0.37, 600).some((v) => v > 0.9)).toBe(true);
    expect(Array.from({ length: 600 }, (_, i) => dabble(i, 0.37, true)).every((v) => v === 0)).toBe(true);
  });
});
