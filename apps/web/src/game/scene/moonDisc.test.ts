import { describe, expect, it } from "vitest";
import { MOON_ROAD_GLINTS, MOON_ROAD_MIN, moonAlpha, moonRoad, moonRoadGlints } from "./moonDisc";

const size = 32;
const at = (alpha: Float32Array, col: number, row: number) => alpha[row * size + col]!;
const mid = size / 2;

describe("the night moon's face", () => {
  it("is fully lit at full moon and only faint at new moon, clear outside the disc", () => {
    const full = moonAlpha(0.5, size);
    const fresh = moonAlpha(0, size);
    expect(at(full, mid, mid)).toBe(1);
    expect(at(fresh, mid, mid)).toBeLessThan(0.2);
    expect(at(full, 0, 0)).toBe(0);
  });

  it("lights the right half at first quarter and the left half at last quarter", () => {
    const first = moonAlpha(0.25, size);
    const last = moonAlpha(0.75, size);
    expect(at(first, size - 4, mid)).toBe(1);
    expect(at(first, 3, mid)).toBeLessThan(0.2);
    expect(at(last, 3, mid)).toBe(1);
    expect(at(last, size - 4, mid)).toBeLessThan(0.2);
  });
});

describe("moon road", () => {
  it("lies on the water only on clear nights with enough moon", () => {
    expect(moonRoad(true, true, 1)).toBe(1);
    expect(moonRoad(true, true, 0.6)).toBe(0.6);
    expect(moonRoad(true, true, MOON_ROAD_MIN - 0.01)).toBe(0);
    expect(moonRoad(true, false, 1)).toBe(0);
    expect(moonRoad(false, true, 1)).toBe(0);
  });
});

describe("moon road glints", () => {
  it("run from the dock toward the moon and stay on the water", () => {
    const all = moonRoadGlints({ x: 0, z: 6.8 }, [-28, 30, -50], () => true);
    expect(all).toHaveLength(MOON_ROAD_GLINTS);
    // Farther glints sit farther toward the moon: up the lake and to the left.
    expect(all.at(-1)!.z).toBeLessThan(all[0]!.z);
    expect(all.at(-1)!.x).toBeLessThan(all[0]!.x);
    const wet = moonRoadGlints({ x: 0, z: 6.8 }, [-28, 30, -50], (_x, z) => z > -5);
    expect(wet.every((glint) => glint.z > -5)).toBe(true);
  });
});
