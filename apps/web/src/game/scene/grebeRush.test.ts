import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { CORMORANT_ROCK } from "./cormorantPerch";
import { GREBE_A, GREBE_B, PAIR_GAP, RUSH_AT, RUSH_GAP, RUSH_SEC, grebePose, grebesOut } from "./grebeRush";

describe("grebes", () => {
  it("are out on spring mornings and days, not in rain", () => {
    expect(grebesOut("day", "clear", "spring")).toBe(true);
    expect(grebesOut("dawn", "fog", "spring")).toBe(true);
    expect(grebesOut("day", "clear", "summer")).toBe(false);
    expect(grebesOut("day", "rain", "spring")).toBe(false);
    expect(grebesOut("dusk", "clear", "spring")).toBe(false);
  });

  it("float near one end, then rush side by side, reared up, to the other", () => {
    const before = grebePose(0, RUSH_AT - 1);
    expect(before.upright).toBe(0);
    expect(before.rushing).toBe(false);
    expect(Math.hypot(before.x - GREBE_A.x, before.z - GREBE_A.z)).toBeLessThan(1);
    const mid0 = grebePose(0, RUSH_AT + RUSH_SEC / 2);
    const mid1 = grebePose(1, RUSH_AT + RUSH_SEC / 2);
    expect(mid0.rushing && mid1.rushing).toBe(true);
    expect(mid0.upright).toBe(1);
    expect(Math.hypot(mid0.x - mid1.x, mid0.z - mid1.z)).toBeCloseTo(PAIR_GAP, 5);
    expect(mid0.yaw).toBeCloseTo(mid1.yaw, 5);
    const after = grebePose(0, RUSH_AT + RUSH_SEC + 1);
    expect(after.upright).toBe(0);
    expect(Math.hypot(after.x - GREBE_B.x, after.z - GREBE_B.z)).toBeLessThan(1);
  });

  it("run back the other way next time, starting where they stopped", () => {
    const end = grebePose(1, RUSH_GAP - 0.01);
    const start = grebePose(1, RUSH_GAP + 0.01);
    expect(Math.hypot(end.x - start.x, end.z - start.z)).toBeLessThan(0.05);
    const back = grebePose(0, RUSH_GAP + RUSH_AT + RUSH_SEC + 1);
    expect(Math.hypot(back.x - GREBE_A.x, back.z - GREBE_A.z)).toBeLessThan(1);
  });

  it("stay on open water, clear of the cormorant's rock", () => {
    for (let time = 0; time < RUSH_GAP * 2; time += 0.2) {
      for (const k of [0, 1] as const) {
        const pose = grebePose(k, time);
        expect(Math.hypot(pose.x / LAKE_RX, (pose.z - LAKE_CENTER_Z) / LAKE_RZ)).toBeLessThan(0.85);
        expect(Math.hypot(pose.x - CORMORANT_ROCK.x, pose.z - CORMORANT_ROCK.z)).toBeGreaterThan(4);
      }
    }
  });

  it("face each other while they wait", () => {
    const a = grebePose(0, 10);
    const b = grebePose(1, 10);
    const toB = Math.atan2(b.x - a.x, b.z - a.z);
    expect(Math.abs(Math.atan2(Math.sin(toB - a.yaw), Math.cos(toB - a.yaw)))).toBeLessThan(0.05);
  });
});
