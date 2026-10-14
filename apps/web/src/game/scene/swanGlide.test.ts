import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { SWAN_BUSK_SEC, SWAN_DIP_GAP, SWAN_DIP_SEC, swanBusk, swanDip, swanPose, swanScared, swansOut } from "./swanGlide";

describe("swans", () => {
  it("are out by day in spring and summer, not in the rain", () => {
    expect(swansOut("day", "clear", "summer")).toBe(true);
    expect(swansOut("dawn", "fog", "spring")).toBe(true);
    expect(swansOut("day", "rain", "summer")).toBe(false);
    expect(swansOut("dusk", "clear", "summer")).toBe(false);
    expect(swansOut("day", "clear", "winter")).toBe(false);
  });

  it("stay on open water, the follower a few meters behind the leader", () => {
    for (let time = 0; time < 400; time += 3) {
      for (const k of [0, 1] as const) {
        const pose = swanPose(k, time);
        expect(Math.hypot(pose.x / LAKE_RX, (pose.z - LAKE_CENTER_Z) / LAKE_RZ)).toBeLessThan(0.9);
        // Out past the water the angler casts on from the dock.
        expect(pose.z).toBeLessThan(-7);
      }
      const gap = Math.hypot(swanPose(0, time).x - swanPose(1, time).x, swanPose(0, time).z - swanPose(1, time).z);
      expect(gap).toBeGreaterThan(0.4);
      expect(gap).toBeLessThan(2.2);
    }
  });

  it("faces the way it glides", () => {
    const a = swanPose(0, 100);
    const b = swanPose(0, 101);
    const heading = Math.atan2(b.x - a.x, b.z - a.z);
    expect(Math.abs(Math.atan2(Math.sin(heading - a.yaw), Math.cos(heading - a.yaw)))).toBeLessThan(0.1);
  });

  it("dips its head to feed and comes back up, never both at once", () => {
    expect(swanDip(0)).toBe(0);
    expect(swanDip(SWAN_DIP_SEC / 2)).toBe(1);
    expect(swanDip(SWAN_DIP_SEC + 1)).toBe(0);
    for (let time = 0; time < SWAN_DIP_GAP * 3; time += 0.25) {
      expect(Math.min(swanPose(0, time).dip, swanPose(1, time).dip)).toBe(0);
    }
  });

  it("hisses at a cast that lands close: the nearer swan, only while the splash is fresh", () => {
    const time = 50;
    const lead = swanPose(0, time);
    const near = { x: lead.x + 0.5, z: lead.z, at: time - 0.1 };
    expect(swanScared(near, time)).toBe(0);
    expect(swanScared({ ...near, at: time - 2 }, time)).toBe(-1);
    expect(swanScared({ x: lead.x + 10, z: lead.z + 10, at: time }, time)).toBe(-1);
    const tail = swanPose(1, time);
    expect(swanScared({ x: tail.x, z: tail.z, at: time }, time)).toBe(1);
  });

  it("raises its wings fast, holds them, then folds them again", () => {
    expect(swanBusk(-1)).toBe(0);
    expect(swanBusk(0.2)).toBeCloseTo(0.5);
    expect(swanBusk(1.5)).toBe(1);
    expect(swanBusk(SWAN_BUSK_SEC - 0.45)).toBeCloseTo(0.5);
    expect(swanBusk(SWAN_BUSK_SEC)).toBe(0);
  });
});
