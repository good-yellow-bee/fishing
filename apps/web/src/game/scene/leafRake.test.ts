import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { walkPath } from "./dogWalk";
import { JUMP_ROUND_SEC, PILE_AT, jumperAt } from "./leafJump";
import { RAKE_ROUND_SEC, STROKE_SEC, rakerAt } from "./leafRake";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("raking the leaf pile", () => {
  it("rakes from round the pile on the grass, facing it, clear of the jumper and the dog walker's path", () => {
    const path = Array.from({ length: 81 }, (_, i) => walkPath(i / 80));
    for (let t = 0; t < Math.max(RAKE_ROUND_SEC, JUMP_ROUND_SEC) * 2; t += 0.1) {
      const raker = rakerAt(t);
      expect(onLand(raker)).toBe(true);
      expect(Math.hypot(raker.x - PILE_AT.x, raker.z - PILE_AT.z)).toBeCloseTo(1.4, 5);
      expect(Math.atan2(PILE_AT.x - raker.x, PILE_AT.z - raker.z)).toBeCloseTo(raker.yaw);
      const jumper = jumperAt(t);
      expect(Math.hypot(raker.x - jumper.x, raker.z - jumper.z)).toBeGreaterThan(1);
      expect(Math.min(...path.map((p) => Math.hypot(p.x - raker.x, p.z - raker.z)))).toBeGreaterThan(0.8);
    }
  });

  it("strokes out and back smoothly from each spot and shifts round between them", () => {
    let last = rakerAt(0);
    let strokes = 0;
    let shifted = false;
    for (let t = 0.02; t < RAKE_ROUND_SEC; t += 0.02) {
      const pose = rakerAt(t);
      expect(Math.abs(pose.stroke - last.stroke)).toBeLessThan(0.1);
      expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThan(0.05);
      if (pose.stroke > 0.95 && last.stroke <= 0.95) strokes += 1;
      if (pose.pace > 0.9) {
        shifted = true;
        expect(pose.stroke).toBe(0);
      }
      last = pose;
    }
    expect(strokes).toBe(16);
    expect(shifted).toBe(true);
    expect(STROKE_SEC).toBeGreaterThan(1);
  });

  it("stands still with the rake drawn in under reduced motion", () => {
    expect(rakerAt(3, true)).toEqual(rakerAt(40, true));
    expect(rakerAt(3, true).stroke).toBe(0);
  });
});
