import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { walkPath } from "./dogWalk";
import { BURST_LEAVES, JUMP_ROUND_SEC, PILE_AT, START_AT, burstLeaf, jumperAt, leafJumpOut } from "./leafJump";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.05;
}

describe("leaf pile jumper", () => {
  it("plays by day in a dry fall", () => {
    expect(leafJumpOut("day", "clear", "fall")).toBe(true);
    expect(leafJumpOut("day", "rain", "fall")).toBe(false);
    expect(leafJumpOut("day", "clear", "summer")).toBe(false);
    expect(leafJumpOut("dusk", "clear", "fall")).toBe(false);
  });

  it("keeps the pile and the run-up on land, behind the dog walker's path", () => {
    const path = Array.from({ length: 41 }, (_, i) => walkPath(i / 40));
    for (const spot of [PILE_AT, START_AT]) {
      expect(onLand(spot)).toBe(true);
      expect(Math.min(...path.map((p) => Math.hypot(p.x - spot.x, p.z - spot.z)))).toBeGreaterThan(1.3);
    }
  });

  it("runs up, leaps, lands in the pile, lies there and walks back, without jumping between frames", () => {
    let flat = 0;
    let high = 0;
    for (let t = 0; t < JUMP_ROUND_SEC; t += 0.02) {
      const a = jumperAt(t);
      const b = jumperAt(t + 0.02);
      expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.15);
      if (a.lie === 1) flat += 1;
      high = Math.max(high, a.y);
    }
    expect(flat).toBeGreaterThan(50);
    expect(high).toBeGreaterThan(0.6);
    expect(jumperAt(JUMP_ROUND_SEC - 0.5)).toMatchObject({ x: START_AT.x, z: START_AT.z });
  });

  it("throws the leaves up when the child lands and lets them settle before the next leap", () => {
    const landed = Array.from({ length: BURST_LEAVES }, (_, i) => burstLeaf(i, 2.6));
    expect(landed.every((leaf) => leaf !== null)).toBe(true);
    expect(Math.max(...landed.map((leaf) => leaf!.y))).toBeGreaterThan(0.6);
    for (let i = 0; i < BURST_LEAVES; i += 1) {
      expect(burstLeaf(i, 1)).toBeNull();
      expect(burstLeaf(i, JUMP_ROUND_SEC - 0.2)).toBeNull();
    }
  });

  it("holds still with reduced motion", () => {
    expect(jumperAt(3, true)).toEqual(jumperAt(300, true));
    expect(burstLeaf(0, 2.6, true)).toBeNull();
  });
});
