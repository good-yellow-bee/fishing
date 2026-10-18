import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { CABIN_AT, CABIN_WALLS, CABIN_SCALE } from "./cabinLook";
import { BLOCK_AT, REACH, CHOP_SEC, CUTTER_AT, STACK_AT, chopAt, choppingOut } from "./woodChopping";

describe("wood chopping", () => {
  it("happens by day in fall and winter, unless it rains", () => {
    expect(choppingOut("day", "clear", "fall")).toBe(true);
    expect(choppingOut("day", "fog", "winter")).toBe(true);
    expect(choppingOut("day", "rain", "fall")).toBe(false);
    expect(choppingOut("day", "clear", "summer")).toBe(false);
    expect(choppingOut("dusk", "clear", "winter")).toBe(false);
  });

  it("keeps the block, the woodcutter and the stack on land, clear of the cabin's walls", () => {
    const halfWidth = (CABIN_WALLS.width / 2) * CABIN_SCALE;
    expect(Math.hypot(CUTTER_AT.x - STACK_AT.x, CUTTER_AT.z - STACK_AT.z)).toBeGreaterThan(0.8);
    for (const at of [BLOCK_AT, CUTTER_AT, STACK_AT]) {
      expect(inLake(at.x, at.z)).toBe(false);
      expect(Math.hypot(at.x - CABIN_AT.x, at.z - CABIN_AT.z)).toBeGreaterThan(halfWidth + 0.2);
    }
    expect(Math.hypot(BLOCK_AT.x - CUTTER_AT.x, BLOCK_AT.z - CUTTER_AT.z)).toBeCloseTo(REACH, 5);
  });

  it("raises the axe overhead, brings it down and splits the log, every round", () => {
    const poses = Array.from({ length: 160 }, (_, i) => chopAt(CHOP_SEC * 3 + i * 0.05));
    expect(Math.max(...poses.map((pose) => pose.swing))).toBeGreaterThan(2.9);
    expect(poses.some((pose) => pose.split === 1)).toBe(true);
    expect(poses.some((pose) => pose.turn < -1.4)).toBe(true);
    // The log is never whole and split at once.
    expect(poses.every((pose) => !(pose.log && pose.split !== null))).toBe(true);
  });

  it("moves smoothly apart from the swing down", () => {
    for (let t = 0; t < CHOP_SEC; t += 0.02) {
      if (t > 2.45 && t < 2.75) continue;
      const a = chopAt(t);
      const b = chopAt(t + 0.02);
      expect(Math.abs(b.swing - a.swing)).toBeLessThan(0.12);
      expect(Math.abs(b.turn - a.turn)).toBeLessThan(0.12);
    }
  });

  it("holds still with reduced motion", () => {
    expect(chopAt(1, true)).toEqual(chopAt(100, true));
  });
});
