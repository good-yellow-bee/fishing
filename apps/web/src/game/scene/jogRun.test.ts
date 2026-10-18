import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { PATH_LENGTH } from "./dogWalk";
import { RUN_SEC, TURN_SEC, jogPath, joggerAt, joggerOut } from "./jogRun";
import { RUN_SEC as SKI_RUN_SEC, TURN_SEC as SKI_TURN_SEC, skiAt } from "./skiTour";
import { KIDS } from "./snowballFight";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.01;
}

describe("winter jogger on the far bank", () => {
  it("runs by day in winter unless it is snowing or foggy", () => {
    expect(joggerOut("day", "clear", "winter")).toBe(true);
    expect(joggerOut("day", "overcast", "winter")).toBe(true);
    expect(joggerOut("day", "rain", "winter")).toBe(false);
    expect(joggerOut("day", "fog", "winter")).toBe(false);
    expect(joggerOut("day", "clear", "summer")).toBe(false);
    expect(joggerOut("dawn", "clear", "winter")).toBe(false);
  });

  it("keeps to the sand, passing the skier at arm's length and well clear of the snowball fight", () => {
    const lap = 2 * (SKI_RUN_SEC + SKI_TURN_SEC);
    for (let t = 0; t < lap * 2; t += 0.1) {
      const jogger = joggerAt(t);
      expect(onLand(jogger)).toBe(true);
      const skier = skiAt(t);
      expect(Math.hypot(skier.x - jogger.x, skier.z - jogger.z)).toBeGreaterThan(0.6);
      for (const kid of KIDS) expect(Math.hypot(kid.x - jogger.x, kid.z - jogger.z)).toBeGreaterThan(1.5);
    }
  });

  it("runs the path at a jogger's pace, end to end and back, never leaving it", () => {
    expect(PATH_LENGTH / RUN_SEC).toBeGreaterThan(2);
    expect(PATH_LENGTH / RUN_SEC).toBeLessThan(3.5);
    const path = Array.from({ length: 201 }, (_, i) => jogPath(i / 200));
    let last = joggerAt(0);
    let ends = 0;
    for (let t = 0.02; t < 2 * (RUN_SEC + TURN_SEC); t += 0.02) {
      const pose = joggerAt(t);
      expect(Math.min(...path.map((p) => Math.hypot(p.x - pose.x, p.z - pose.z)))).toBeLessThan(0.15);
      expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThan(0.1);
      expect(Math.abs(pose.stride - last.stride)).toBeLessThan(0.2);
      expect(Math.abs(pose.pace - last.pace)).toBeLessThan(0.05);
      if (pose.pace < 0.6 && last.pace >= 0.6) ends += 1;
      last = pose;
    }
    expect(ends).toBe(2);
  });

  it("turns round smoothly at each end, facing back the way they came", () => {
    const before = joggerAt(RUN_SEC - 0.01);
    const after = joggerAt(RUN_SEC + TURN_SEC + 0.01);
    const turned = Math.atan2(Math.sin(after.yaw - before.yaw), Math.cos(after.yaw - before.yaw));
    expect(Math.abs(Math.abs(turned) - Math.PI)).toBeLessThan(0.1);
  });

  it("stands still mid-path under reduced motion", () => {
    expect(joggerAt(3, true)).toEqual(joggerAt(30, true));
  });
});
