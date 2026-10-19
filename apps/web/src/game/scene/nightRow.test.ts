import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { LOON_LOOP } from "./loonMotion";
import { LAP_SEC, OAR_REACH, STROKE_SEC, lanternFlicker, nightRowAt, nightRowOut, rowBladeUp, rowSweep } from "./nightRow";

describe("night row", () => {
  it("goes out on calm nights from spring to fall", () => {
    expect(nightRowOut("night", "clear", "summer", { x: 0.01, z: 0 })).toBe(true);
    expect(nightRowOut("night", "overcast", "fall", { x: 0, z: 0 })).toBe(true);
    expect(nightRowOut("dusk", "clear", "summer", { x: 0, z: 0 })).toBe(false);
    expect(nightRowOut("night", "rain", "summer", { x: 0, z: 0 })).toBe(false);
    expect(nightRowOut("night", "clear", "winter", { x: 0, z: 0 })).toBe(false);
    expect(nightRowOut("night", "clear", "summer", { x: 0.1, z: 0 })).toBe(false);
  });

  it("rows round its loop smoothly, bow ahead, oars clear of the bank, the dock and the loon", () => {
    let last = nightRowAt(0);
    for (let t = 0.1; t < LAP_SEC; t += 0.1) {
      const pose = nightRowAt(t);
      const step = Math.hypot(pose.x - last.x, pose.z - last.z);
      expect(step).toBeLessThan(0.1);
      // Heading the way it moves.
      expect(Math.sin(pose.yaw) * (pose.x - last.x) + Math.cos(pose.yaw) * (pose.z - last.z)).toBeGreaterThan(0);
      for (const side of [-1, 1]) {
        const tip = { x: pose.x + side * Math.cos(pose.yaw) * OAR_REACH, z: pose.z - side * Math.sin(pose.yaw) * OAR_REACH };
        expect(inLake(tip.x, tip.z)).toBe(true);
        expect(tip.z).toBeLessThan(4.5);
        expect(((tip.x - LOON_LOOP.x) / (LOON_LOOP.rx + 0.5)) ** 2 + ((tip.z - LOON_LOOP.z) / (LOON_LOOP.rz + 0.5)) ** 2).toBeGreaterThan(1);
      }
      last = pose;
    }
  });

  it("sweeps its oars back through the drive with the blades in, and forward with them lifted", () => {
    expect(rowSweep(0)).toBeGreaterThan(0.5);
    expect(rowSweep(0.45)).toBeLessThan(-0.4);
    expect(rowSweep(0.999)).toBeCloseTo(rowSweep(0), 2);
    expect(rowBladeUp(0.2)).toBe(0);
    expect(rowBladeUp(0.7)).toBe(1);
    expect(rowBladeUp(0.999)).toBeCloseTo(rowBladeUp(0), 1);
    expect(nightRowAt(STROKE_SEC * 0.5).stroke).toBeCloseTo(0.5);
  });

  it("holds still and steady when motion is reduced", () => {
    expect(nightRowAt(3, true)).toEqual(nightRowAt(90, true));
    expect(lanternFlicker(4, true)).toBe(1);
    expect(lanternFlicker(4)).toBeGreaterThan(0.75);
  });
});
