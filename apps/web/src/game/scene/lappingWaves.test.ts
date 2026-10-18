import { describe, expect, it } from "vitest";
import { LAP_SEC, foamOpacity, onshore, shoreOutward, washAt } from "./lappingWaves";

const NORTH_WIND = { x: 0, z: -0.13 };

describe("lapping waves", () => {
  it("knows which way is out from the lake round its edge", () => {
    const east = shoreOutward(0);
    expect(east.x).toBeCloseTo(1);
    // The shape's +y is the world's -z, so a quarter turn round is the north (far) shore.
    const north = shoreOutward(Math.PI / 2);
    expect(north.z).toBeCloseTo(-1);
  });

  it("washes hardest on the bank the wind blows onto, and not on the sheltered one", () => {
    expect(onshore(Math.PI / 2, NORTH_WIND)).toBeCloseTo(1);
    expect(onshore(-Math.PI / 2, NORTH_WIND)).toBe(0);
    expect(onshore(Math.PI / 2, { x: 0, z: 0 })).toBe(0);
    const reach = (angle: number) => Math.max(...Array.from({ length: 100 }, (_, i) => washAt(angle, NORTH_WIND, (i / 100) * LAP_SEC).reach));
    expect(reach(Math.PI / 2)).toBeGreaterThan(reach(-Math.PI / 2) * 4);
  });

  it("laps in and out, a wave at a time", () => {
    const reaches = Array.from({ length: 64 }, (_, i) => washAt(1, NORTH_WIND, (i / 64) * LAP_SEC).reach);
    expect(Math.min(...reaches)).toBeLessThan(0.02);
    expect(Math.max(...reaches)).toBeGreaterThan(0.2);
    expect(washAt(1, NORTH_WIND, 0.7).reach).toBeCloseTo(washAt(1, NORTH_WIND, 0.7 + LAP_SEC).reach);
  });

  it("runs the waves along the bank, so neighbouring stretches are out of step", () => {
    expect(washAt(1, NORTH_WIND, 2).reach).not.toBeCloseTo(washAt(1.2, NORTH_WIND, 2).reach);
  });

  it("holds each bank still for reduced motion", () => {
    expect(washAt(2, NORTH_WIND, 1, true)).toEqual(washAt(2, NORTH_WIND, 9, true));
  });

  it("dims the foam at night and leaves it under the ice in winter", () => {
    expect(foamOpacity("night", "summer")).toBeLessThan(foamOpacity("day", "summer"));
    expect(foamOpacity("day", "winter")).toBe(0);
  });
});
