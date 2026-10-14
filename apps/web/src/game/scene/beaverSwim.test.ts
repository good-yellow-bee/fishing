import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  BEAVER_CROSS_SEC,
  BEAVER_DIVE_SEC,
  BEAVER_GAP_SEC,
  BEAVER_RING_SEC,
  BEAVER_SLAP_SEC,
  BEAVER_START_SEC,
  beaverOut,
  beaverPose,
  beaverRoute,
  stepBeaver,
  type BeaverState,
} from "./beaverSwim";

const NO_SPLASH = { x: 0, z: 0, at: Number.NEGATIVE_INFINITY };
const SWIMMING: BeaverState = { mode: "swimming" };

describe("beaver", () => {
  it("is out at dusk outside winter", () => {
    expect(beaverOut("dusk", "summer")).toBe(true);
    expect(beaverOut("dusk", "winter")).toBe(false);
    expect(beaverOut("day", "summer")).toBe(false);
  });

  it("crosses the lake on the water, out of sight between crossings", () => {
    expect(beaverPose(BEAVER_START_SEC - 1)).toBeNull();
    expect(beaverPose(BEAVER_START_SEC + BEAVER_CROSS_SEC + 1)).toBeNull();
    for (let into = 0; into <= BEAVER_CROSS_SEC; into += 2) {
      const pose = beaverPose(BEAVER_START_SEC + into)!;
      expect(Math.hypot(pose.x / LAKE_RX, (pose.z - LAKE_CENTER_Z) / LAKE_RZ)).toBeLessThan(0.95);
    }
    const mid = beaverPose(BEAVER_START_SEC + BEAVER_CROSS_SEC / 2)!;
    expect(mid.under).toBe(0);
    expect(mid.moving).toBe(true);
  });

  it("goes the other way on the next crossing and faces where it swims", () => {
    const a = beaverRoute(0, 10);
    const b = beaverRoute(0, 11);
    expect(Math.sign(b.x - a.x)).toBe(Math.sign(Math.sin(a.yaw)));
    const c = beaverRoute(1, 10);
    const d = beaverRoute(1, 11);
    expect(Math.sign(d.x - c.x)).toBe(-Math.sign(b.x - a.x));
  });

  it("slaps its tail and dives at a close cast, then comes back next crossing", () => {
    const time = BEAVER_START_SEC + 20;
    const at = beaverRoute(0, 20);
    const far = stepBeaver(SWIMMING, time, { x: at.x + 9, z: at.z, at: time - 0.1 });
    expect(far.mode).toBe("swimming");
    const old = stepBeaver(SWIMMING, time, { x: at.x, z: at.z, at: time - 3 });
    expect(old.mode).toBe("swimming");
    const slapped = stepBeaver(SWIMMING, time, { x: at.x + 1, z: at.z, at: time - 0.1 });
    expect(slapped.mode).toBe("slapped");
    expect(beaverPose(time + BEAVER_SLAP_SEC * 0.6, slapped)!.tail).toBeGreaterThan(0.8);
    expect(beaverPose(time + BEAVER_SLAP_SEC * 0.6, slapped)!.under).toBe(0);
    expect(beaverPose(time + BEAVER_SLAP_SEC + 0.1, slapped)!.splash).toBeGreaterThan(0);
    expect(beaverPose(time + BEAVER_SLAP_SEC + BEAVER_DIVE_SEC + 0.05, slapped)!.under).toBe(1);
    expect(beaverPose(time + BEAVER_SLAP_SEC + BEAVER_RING_SEC + 1, slapped)).toBeNull();
    expect(stepBeaver(slapped, time + 10, NO_SPLASH).mode).toBe("slapped");
    expect(stepBeaver(slapped, BEAVER_GAP_SEC + 1, NO_SPLASH).mode).toBe("swimming");
  });
});
