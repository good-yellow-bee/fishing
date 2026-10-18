import { describe, expect, it } from "vitest";
import { OWL_TREE } from "./owlMotion";
import { DRUM_HEIGHTS, WOODPECKER_LAP_SEC, trunkRadius, woodpeckerAt, woodpeckerOut } from "./woodpeckerDrum";

const lap = Array.from({ length: WOODPECKER_LAP_SEC * 50 }, (_, i) => woodpeckerAt(i / 50));

describe("the woodpecker on the dead tree", () => {
  it("is out from dawn through the day, leaving the tree to the owl", () => {
    expect(woodpeckerOut("day")).toBe(true);
    expect(woodpeckerOut("dawn")).toBe(true);
    expect(woodpeckerOut("dusk")).toBe(false);
    expect(woodpeckerOut("night")).toBe(false);
  });

  it("clings to the bark except while it swoops", () => {
    for (const pose of lap) {
      const off = pose.x - OWL_TREE.x - trunkRadius(pose.y);
      if (pose.flap === 0) expect(off).toBeCloseTo(0.03, 5);
      else expect(off).toBeGreaterThan(0);
      expect(pose.z).toBe(OWL_TREE.z);
    }
  });

  it("drums in short bursts at each of its heights", () => {
    const drumming = lap.filter((pose) => pose.peck > 0.5);
    expect(drumming.length / lap.length).toBeGreaterThan(0.05);
    expect(drumming.length / lap.length).toBeLessThan(0.3);
    for (const height of DRUM_HEIGHTS) expect(drumming.some((pose) => Math.abs(pose.y - height) < 1e-6)).toBe(true);
  });

  it("works up the trunk and swoops back down, never jumping", () => {
    expect(Math.max(...lap.map((pose) => pose.y))).toBeCloseTo(DRUM_HEIGHTS[2], 5);
    expect(Math.min(...lap.map((pose) => pose.y))).toBeCloseTo(DRUM_HEIGHTS[0], 5);
    for (let i = 1; i < lap.length; i += 1) {
      expect(Math.abs(lap[i]!.y - lap[i - 1]!.y)).toBeLessThan(0.1);
      expect(Math.abs(lap[i]!.x - lap[i - 1]!.x)).toBeLessThan(0.1);
    }
    expect(lap.some((pose) => pose.flap > 0)).toBe(true);
  });

  it("holds still for reduced motion", () => {
    expect(woodpeckerAt(7.3, true)).toEqual(woodpeckerAt(0, true));
    expect(woodpeckerAt(0, true).peck).toBe(0);
  });
});
