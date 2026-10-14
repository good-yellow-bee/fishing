import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { SWAN_DIP_GAP, SWAN_DIP_SEC, swanDip, swanPose, swansOut } from "./swanGlide";

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
});
