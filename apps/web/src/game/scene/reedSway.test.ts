import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { REED_MAX_LEAN, reedStem, reedTilt } from "./reedSway";

/** Where a 1 m stem's top ends up under a tilt. */
function top(tilt: { x: number; z: number }) {
  return new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(tilt.x, 0, tilt.z));
}

describe("reeds in the wind", () => {
  it("lean their tops downwind, further in a stronger wind", () => {
    const east = top(reedTilt({ x: 0.08, z: 0 }, 0, 0, true));
    expect(east.x).toBeGreaterThan(0.05);
    expect(Math.abs(east.z)).toBeLessThan(1e-6);
    const south = top(reedTilt({ x: 0, z: 0.04 }, 0, 0, true));
    expect(south.z).toBeGreaterThan(0.02);
    const light = top(reedTilt({ x: 0.04, z: 0 }, 0, 0, true)).x;
    expect(east.x).toBeGreaterThan(light);
  });

  it("never tip past their limit, however hard it blows", () => {
    for (let t = 0; t < 40; t += 0.3) {
      const tilt = reedTilt({ x: 0.13, z: 0.13 }, t, 1.2);
      expect(Math.hypot(tilt.x, tilt.z)).toBeLessThanOrEqual(REED_MAX_LEAN + 1e-9);
    }
  });

  it("nod about their lean, more in a wind than in a calm", () => {
    const range = (wind: { x: number; z: number }) => {
      const tips = Array.from({ length: 200 }, (_, i) => top(reedTilt(wind, i * 0.1, 0.5)).x);
      return Math.max(...tips) - Math.min(...tips);
    };
    expect(range({ x: 0, z: 0 })).toBeGreaterThan(0.01);
    expect(range({ x: 0.08, z: 0 })).toBeGreaterThan(range({ x: 0, z: 0 }) * 2);
  });

  it("keep their lean but stop nodding for reduced motion", () => {
    const wind = { x: 0.08, z: 0 };
    expect(reedTilt(wind, 3, 0.4, true)).toEqual(reedTilt(wind, 9, 2.1, true));
    const calm = reedTilt({ x: 0, z: 0 }, 5, 1, true);
    expect(Math.hypot(calm.x, calm.z)).toBe(0);
  });
});

describe("reed clumps", () => {
  it("stand in rows of four going back from the clump's root, each its own size and beat", () => {
    const origin = [-13.2, 0.03, 1.8] as const;
    expect(reedStem(origin, 0)).toMatchObject({ x: -13.2, y: 0.03, z: 1.8, yaw: 0, scale: 1.45 });
    const fifth = reedStem(origin, 5);
    expect(fifth.x).toBeCloseTo(-12.68);
    expect(fifth.z).toBeCloseTo(1.36);
    expect(fifth.scale).toBeCloseTo(1.77);
    expect(reedStem(origin, 1).phase).not.toBe(reedStem(origin, 2).phase);
  });
});
