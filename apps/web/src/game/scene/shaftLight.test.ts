import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { SHAFT_COUNT, SHAFT_TOP, shaftDirection, shaftGlow, shaftLayout, shaftStrength } from "./shaftLight";

const DAWN_DISC: [number, number, number] = [32, 14, -58];

describe("morning shafts of light", () => {
  it("need the dawn sun out over the mist", () => {
    expect(shaftStrength("dawn", "clear")).toBe(1);
    expect(shaftStrength("dawn", "partly-cloudy")).toBeGreaterThan(0);
    for (const sky of ["overcast", "rain", "fog"] as const) expect(shaftStrength("dawn", sky)).toBe(0);
    for (const hour of ["day", "dusk", "night"] as const) expect(shaftStrength(hour, "clear")).toBe(0);
  });

  it("run down from the sun's side of the lake", () => {
    const dir = shaftDirection(DAWN_DISC);
    expect(Math.hypot(...dir)).toBeCloseTo(1, 6);
    expect(dir[1]).toBeLessThan(0);
    // The dawn sun sits north-east, so the light heads south-west.
    expect(dir[0]).toBeLessThan(0);
    expect(dir[2]).toBeGreaterThan(0);
  });

  it("land on open water, spread across the lake, and reach back up toward the sun", () => {
    const shafts = shaftLayout(DAWN_DISC);
    expect(shafts).toHaveLength(SHAFT_COUNT);
    const dir = shaftDirection(DAWN_DISC);
    for (const shaft of shafts) {
      expect(inLake(shaft.to[0], shaft.to[2])).toBe(true);
      expect(shaft.to[1]).toBe(0);
      expect(shaft.from[1]).toBe(SHAFT_TOP);
      // The top is up-light of the landing: back along the light's own line.
      const run = [shaft.to[0] - shaft.from[0], shaft.to[1] - shaft.from[1], shaft.to[2] - shaft.from[2]];
      const length = Math.hypot(...run);
      run.forEach((v, axis) => expect(v / length).toBeCloseTo(dir[axis]!, 6));
    }
    const across = shafts.map((s) => s.to[0]);
    expect(Math.max(...across) - Math.min(...across)).toBeGreaterThan(12);
    expect(shaftLayout(DAWN_DISC)).toEqual(shafts);
  });

  it("swell and thin on their own beats, and hold still for reduced motion", () => {
    const samples = Array.from({ length: 400 }, (_, t) => shaftGlow(2, t * 0.5));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0.15);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.5);
    expect(shaftGlow(0, 10)).not.toBeCloseTo(shaftGlow(1, 10), 3);
    expect(shaftGlow(3, 10, true)).toBe(0.7);
    expect(shaftGlow(3, 99, true)).toBe(0.7);
  });
});
