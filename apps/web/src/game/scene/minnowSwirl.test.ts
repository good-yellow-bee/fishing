import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { MINNOW_COUNT, MINNOW_POOL, minnowAt, minnowsOut } from "./minnowSwirl";

describe("lantern minnows", () => {
  it("come out only when the lanterns burn full", () => {
    expect(minnowsOut("night")).toBe(true);
    expect(minnowsOut("dusk")).toBe(false);
    expect(minnowsOut("day")).toBe(false);
    expect(minnowsOut("dawn")).toBe(false);
  });

  it("keep to the lit pool in the lake, and hold still for reduced motion", () => {
    for (let i = 0; i < MINNOW_COUNT; i += 1) {
      for (const t of [0, 1.3, 7.9, 42]) {
        const pose = minnowAt(i, t);
        expect(Math.hypot(pose.x - MINNOW_POOL.x, pose.z - MINNOW_POOL.z)).toBeLessThanOrEqual(MINNOW_POOL.r + 1e-9);
        expect(inLake(pose.x, pose.z)).toBe(true);
      }
      expect(minnowAt(i, 9, true)).toEqual(minnowAt(i, 0, true));
    }
  });

  it("swim, so a moment later most have moved", () => {
    const moved = Array.from({ length: MINNOW_COUNT }, (_, i) => {
      const a = minnowAt(i, 2);
      const b = minnowAt(i, 2.5);
      return Math.hypot(a.x - b.x, a.z - b.z) > 0.05;
    });
    expect(moved.filter(Boolean).length).toBeGreaterThan(MINNOW_COUNT / 2);
  });
});
