import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { WHIRLIGIG_COUNT, WHIRLIGIG_RAFT, raftMiddle, raftOnWater, whirligigAt, whirligigsOut } from "./whirligigSpin";

describe("whirligig beetles off the dock", () => {
  it("gather on warm, dry, still days from spring through summer", () => {
    expect(whirligigsOut("day", "clear", "summer", 0.04)).toBe(true);
    expect(whirligigsOut("day", "overcast", "spring", 0)).toBe(true);
    expect(whirligigsOut("day", "rain", "summer", 0)).toBe(false);
    expect(whirligigsOut("dusk", "clear", "summer", 0)).toBe(false);
    expect(whirligigsOut("day", "clear", "fall", 0)).toBe(false);
    expect(whirligigsOut("day", "clear", "summer", 0.13)).toBe(false);
  });

  it("keep to their raft on open water, clear of the dock", () => {
    expect(raftOnWater()).toBe(true);
    for (let i = 0; i < WHIRLIGIG_COUNT; i += 1) {
      for (let t = 0; t < 200; t += 0.7) {
        const { x, z } = whirligigAt(i, t);
        const middle = raftMiddle(t);
        expect(Math.hypot(x - middle.x, z - middle.z)).toBeLessThan(WHIRLIGIG_RAFT.r + 0.1);
        expect(x).toBeGreaterThan(DOCK_PLANKS.maxX + 0.5);
      }
    }
  });

  it("whirl in quick, tight loops, both ways round", () => {
    let fastest = 0;
    const ways = new Set<number>();
    for (let t = 0; t < 30; t += 0.02) {
      const a = whirligigAt(3, t);
      const b = whirligigAt(3, t + 0.02);
      fastest = Math.max(fastest, Math.hypot(b.x - a.x, b.z - a.z) / 0.02);
      // Which way it turns: the sign of the cross product of its facing and where it goes next.
      const ahead = { x: Math.sin(a.yaw), z: Math.cos(a.yaw) };
      const next = { x: Math.sin(b.yaw), z: Math.cos(b.yaw) };
      const cross = ahead.x * next.z - ahead.z * next.x;
      if (Math.abs(cross) > 0.05) ways.add(Math.sign(cross));
    }
    expect(fastest).toBeGreaterThan(0.15);
    expect(fastest).toBeLessThan(1.5);
    expect(ways.size).toBe(2);
  });

  it("face the way they are going", () => {
    const a = whirligigAt(5, 10);
    const b = whirligigAt(5, 10.005);
    const go = Math.atan2(b.x - a.x, b.z - a.z);
    expect(Math.cos(go - a.yaw)).toBeGreaterThan(0.9);
  });

  it("hold their spots under reduced motion", () => {
    expect(whirligigAt(2, 3, true)).toEqual(whirligigAt(2, 90, true));
  });
});
