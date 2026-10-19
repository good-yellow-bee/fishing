import { describe, expect, it } from "vitest";
import { PERCH_SPOTS, SWALLOW_COUNT, SWOOP_SEC, VISIT_EVERY_SEC, VISIT_SEC, ropeSwallowAt, ropeSwallowsOut } from "./swallowPerch";

describe("swallows on the mooring line", () => {
  it("come on fine days in spring and summer", () => {
    expect(ropeSwallowsOut("day", "clear", "summer")).toBe(true);
    expect(ropeSwallowsOut("day", "overcast", "spring")).toBe(true);
    expect(ropeSwallowsOut("day", "rain", "summer")).toBe(false);
    expect(ropeSwallowsOut("day", "fog", "summer")).toBe(false);
    expect(ropeSwallowsOut("dusk", "clear", "summer")).toBe(false);
    expect(ropeSwallowsOut("day", "clear", "fall")).toBe(false);
  });

  it("sit in a row along the rope, spaced apart", () => {
    for (let i = 1; i < SWALLOW_COUNT; i += 1) expect(PERCH_SPOTS[i]! - PERCH_SPOTS[i - 1]!).toBeGreaterThan(0.1);
    expect(PERCH_SPOTS[0]).toBeGreaterThan(0.2);
    expect(PERCH_SPOTS[SWALLOW_COUNT - 1]).toBeLessThan(0.8);
  });

  it("are away most of the time and all sit together for a while each visit", () => {
    let together = 0;
    let seen = 0;
    for (let t = 0; t < VISIT_EVERY_SEC * 3; t += 0.1) {
      const poses = Array.from({ length: SWALLOW_COUNT }, (_, i) => ropeSwallowAt(i, t));
      if (poses.some((pose) => pose.here)) seen += 0.1;
      if (poses.every((pose) => pose.here && !pose.flying)) together += 0.1;
    }
    expect(seen).toBeLessThan(VISIT_SEC * 3 + 1);
    expect(together).toBeGreaterThan(30);
  });

  it("swoop in and fly off without jumps, and sit right on their spot", () => {
    for (let i = 0; i < SWALLOW_COUNT; i += 1) {
      let last = ropeSwallowAt(i, 0);
      for (let t = 0.01; t < VISIT_EVERY_SEC * 2; t += 0.01) {
        const pose = ropeSwallowAt(i, t);
        if (pose.here && last.here) expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.08);
        if (pose.here && !pose.flying) {
          expect([pose.x, pose.y, pose.z, pose.flap]).toEqual([0, 0, 0, 0]);
          expect(pose.along).toBe(PERCH_SPOTS[i]);
        }
        last = pose;
      }
    }
    expect(SWOOP_SEC).toBeGreaterThan(0.5);
  });

  it("sit still in a row with reduced motion", () => {
    for (let i = 0; i < SWALLOW_COUNT; i += 1) expect(ropeSwallowAt(i, 3, true)).toEqual(ropeSwallowAt(i, 300, true));
  });
});
