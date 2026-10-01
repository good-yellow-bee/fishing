import { LAKE_CENTER_Z } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  BOBBER_RING_LIFT,
  bedColor,
  bedHeight,
  bobberRingHeight,
  waterDepth,
  waterDepthColor,
  waterHeight,
  type WaterRgb,
} from "./water.ts";

function luma(color: WaterRgb) {
  return color.r * 0.3 + color.g * 0.59 + color.b * 0.11;
}

describe("lake depth", () => {
  it("stays shallow and pale by the bank and the dock, and dark offshore", () => {
    const bank = waterDepth(21, LAKE_CENTER_Z);
    const dock = waterDepth(0, 5.4);
    const offshore = waterDepth(0, LAKE_CENTER_Z);
    expect(bank).toBeLessThan(0.15);
    expect(dock).toBeLessThan(0.2);
    expect(offshore).toBeGreaterThan(0.85);
    expect(luma(waterDepthColor(0, 5.4))).toBeGreaterThan(luma(waterDepthColor(0, LAKE_CENTER_Z)) + 0.6);
    expect(luma(waterDepthColor(21, LAKE_CENTER_Z))).toBeGreaterThan(luma(waterDepthColor(0, LAKE_CENTER_Z)));
    expect(luma(bedColor(0, 5.4))).toBeGreaterThan(luma(bedColor(0, LAKE_CENTER_Z)));
  });

  it("lifts the bed in the shallows and keeps it under the swimming fish", () => {
    expect(bedHeight(0, 5.4)).toBeGreaterThan(bedHeight(0, LAKE_CENTER_Z));
    expect(bedHeight(0, LAKE_CENTER_Z)).toBeLessThan(-1.8);
    for (const [x, z] of [
      [-2, 5],
      [0, 3],
      [3, 4],
      [-5, 1],
      [5, 2],
    ] as const) {
      expect(bedHeight(x, z)).toBeLessThan(-0.75);
    }
  });

  it("puts the sitting ring on the chop, not on a flat plane", () => {
    const offshore = { x: 0, z: -6 };
    const early = bobberRingHeight(offshore.x, offshore.z, 0.4);
    const later = bobberRingHeight(offshore.x, offshore.z, 2.3);
    expect(early).toBeCloseTo(waterHeight(offshore.x, offshore.z, 0.4) + BOBBER_RING_LIFT);
    expect(Math.abs(early - later)).toBeGreaterThan(0.02);
    expect(early).not.toBe(0);
    expect(bobberRingHeight(0, 40, 1.2)).toBeCloseTo(BOBBER_RING_LIFT);
  });
});
