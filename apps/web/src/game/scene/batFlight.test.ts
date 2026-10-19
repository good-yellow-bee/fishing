import { describe, expect, it } from "vitest";
import { BAT_COUNT, BAT_HIGH, BAT_LOW, SWOOP_EVERY_SEC, SWOOP_LAMP, batAt, batOverWater, batsOut, swoopAt } from "./batFlight";
import { DOCK_PLANKS } from "@stillwater/shared";

describe("bats", () => {
  it("come out on summer dusks and nights and dry spring dusks", () => {
    expect(batsOut("dusk", "clear", "summer")).toBe(true);
    expect(batsOut("night", "partly-cloudy", "summer")).toBe(true);
    expect(batsOut("dusk", "clear", "spring")).toBe(true);
    expect(batsOut("night", "clear", "spring")).toBe(false);
    expect(batsOut("day", "clear", "summer")).toBe(false);
    expect(batsOut("dusk", "rain", "summer")).toBe(false);
    expect(batsOut("dusk", "clear", "fall")).toBe(false);
    expect(batsOut("night", "clear", "winter")).toBe(false);
  });

  it("stay over the water and inside their height band", () => {
    for (let i = 0; i < BAT_COUNT; i += 1) {
      for (let t = 0; t < 120; t += 0.7) {
        const pose = batAt(i, t);
        expect(batOverWater(pose)).toBe(true);
        expect(pose.y).toBeGreaterThanOrEqual(BAT_LOW - 1e-9);
        expect(pose.y).toBeLessThanOrEqual(BAT_HIGH + 1e-9);
      }
    }
  });

  it("move and flap, but glide still for reduced motion", () => {
    expect(batAt(0, 3).x).not.toBeCloseTo(batAt(0, 5).x, 2);
    expect(batAt(2, 10, true)).toEqual({ ...batAt(2, 0, true) });
    expect(batAt(2, 10, true).flap).toBe(0);
  });

  it("now and then sends one bat in to hawk round the dock's right-hand lantern, and back, without jumps", () => {
    expect(SWOOP_LAMP.x).toBeGreaterThan(0);
    expect(Math.abs(SWOOP_LAMP.z - DOCK_PLANKS.minZ)).toBeLessThan(0.3);
    let closest = Infinity;
    let swoops = 0;
    let last = batAt(0, 0);
    let wasIn = false;
    for (let t = 0; t < SWOOP_EVERY_SEC * 3; t += 1 / 60) {
      const pose = batAt(0, t);
      closest = Math.min(closest, Math.hypot(pose.x - SWOOP_LAMP.x, pose.z - SWOOP_LAMP.z));
      expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.35);
      const isIn = swoopAt(t) > 0;
      if (isIn && !wasIn) swoops += 1;
      wasIn = isIn;
      last = pose;
    }
    expect(closest).toBeLessThan(0.6);
    expect(swoops).toBeGreaterThanOrEqual(2);
    // The others keep to their loops.
    for (let t = 0; t < 60; t += 0.5) expect(Math.hypot(batAt(1, t).x - SWOOP_LAMP.x, batAt(1, t).z - SWOOP_LAMP.z)).toBeGreaterThan(1);
  });
});
