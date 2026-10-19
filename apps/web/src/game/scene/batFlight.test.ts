import { describe, expect, it } from "vitest";
import { BAT_COUNT, BAT_HIGH, BAT_LOW, SWOOP_CENTER, SWOOP_LAMP, SWOOP_RADIUS, batAt, batOverWater, batsOut, swoopAt } from "./batFlight";
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
        // Hawking at the lantern, the first bat drops lower, among the moths.
        if (i === 0 && swoopAt(t) > 0) continue;
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

  it("now and then sends one bat in to hawk round the dock's right-hand lantern, and back, never darting or spinning", () => {
    expect(SWOOP_LAMP.x).toBeGreaterThan(0);
    expect(Math.abs(SWOOP_LAMP.z - DOCK_PLANKS.minZ)).toBeLessThan(0.3);
    // Its turns are off the dock's end, over the water, among the moths.
    expect(SWOOP_CENTER.z + SWOOP_RADIUS).toBeLessThan(DOCK_PLANKS.minZ);
    expect(SWOOP_CENTER.y).toBeLessThan(SWOOP_LAMP.y + 0.5);
    let closest = Infinity;
    let swoops = 0;
    let last = batAt(0, 0);
    let wasIn = false;
    for (let t = 0; t < 3600; t += 1 / 60) {
      const pose = batAt(0, t);
      closest = Math.min(closest, Math.hypot(pose.x - SWOOP_LAMP.x, pose.z - SWOOP_LAMP.z));
      // No faster than the loops at their quickest, give or take.
      expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.16);
      // Where the turns at the light lead, its heading swings smoothly (the loops have quick jinks of their own).
      if (swoopAt(t) > 0.5 && swoopAt(t - 1 / 60) > 0.5) expect(Math.abs(Math.atan2(Math.sin(pose.yaw - last.yaw), Math.cos(pose.yaw - last.yaw)))).toBeLessThan(0.4);
      expect(batOverWater(pose)).toBe(true);
      const isIn = swoopAt(t) > 0;
      if (isIn && !wasIn) swoops += 1;
      wasIn = isIn;
      last = pose;
    }
    expect(closest).toBeLessThan(0.9);
    expect(swoops).toBeGreaterThanOrEqual(10);
    // The others keep to their loops.
    for (let i = 1; i < BAT_COUNT; i += 1) for (let t = 0; t < 300; t += 0.25) expect(Math.hypot(batAt(i, t).x - SWOOP_CENTER.x, batAt(i, t).z - SWOOP_CENTER.z)).toBeGreaterThan(0.6);
  });
});
