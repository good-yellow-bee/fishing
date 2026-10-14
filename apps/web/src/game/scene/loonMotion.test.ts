import { describe, expect, it } from "vitest";
import { inLake, onDockPlanks, walkableAt } from "@stillwater/shared";
import { LOON_CALL_SEC, LOON_SURFACE_SEC, LOON_TIP_SEC, LOON_UNDER_SEC, loonCallLift, loonOut, loonPose, soundPlace } from "./loonMotion";

describe("the loon", () => {
  it("is out at dusk and night, but not by day or over winter ice", () => {
    expect(loonOut("dusk", "summer")).toBe(true);
    expect(loonOut("night", "fall")).toBe(true);
    expect(loonOut("day", "summer")).toBe(false);
    expect(loonOut("night", "winter")).toBe(false);
  });

  it("keeps to open water all the way round its loop", () => {
    for (let time = 0; time < 400; time += 1.7) {
      const pose = loonPose(time);
      expect(inLake(pose.x, pose.z), `t ${time}`).toBe(true);
      expect(onDockPlanks(pose.x, pose.z)).toBe(false);
      expect(walkableAt(pose.x, pose.z)).toBe(false);
    }
  });

  it("dives, swims under, and comes up farther along than it would have paddled", () => {
    const down = LOON_SURFACE_SEC + LOON_TIP_SEC;
    expect(loonPose(1).under).toBe(0);
    expect(loonPose(LOON_SURFACE_SEC + LOON_TIP_SEC / 2).pitch).toBeLessThan(0);
    expect(loonPose(down + 1).under).toBe(1);
    const before = loonPose(down);
    const after = loonPose(down + LOON_UNDER_SEC);
    const paddled = loonPose(LOON_UNDER_SEC);
    const start = loonPose(0);
    const gone = Math.hypot(after.x - before.x, after.z - before.z);
    expect(gone).toBeGreaterThan(Math.hypot(paddled.x - start.x, paddled.z - start.z) * 2);
  });

  it("moves smoothly, with no jump where a dive ends", () => {
    for (let time = 0; time < 120; time += 0.05) {
      const a = loonPose(time);
      const b = loonPose(time + 0.05);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.1);
    }
  });

  it("lifts its head for a call, then lowers it", () => {
    expect(loonCallLift(-1)).toBe(0);
    expect(loonCallLift(1)).toBe(1);
    expect(loonCallLift(LOON_CALL_SEC)).toBe(0);
  });

  it("places a call left or right of the listener and quieter far away", () => {
    const ear = { x: 0, z: 0 };
    const right = { x: 1, z: 0 };
    expect(soundPlace(ear, right, 10, 0).pan).toBeCloseTo(1);
    expect(soundPlace(ear, right, -10, 0).pan).toBeCloseTo(-1);
    expect(soundPlace(ear, right, 0, -10).pan).toBeCloseTo(0);
    expect(soundPlace(ear, right, 30, 0).gain).toBeLessThan(soundPlace(ear, right, 5, 0).gain);
  });
});
