import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { MALLARD_EDGE, MALLARD_STOP, MALLARD_Y, VISIT_EVERY_SEC, VISIT_SEC, mallardAt, mallardOut } from "./mallardWaddle";
import { LOOP_SEC, snailAt } from "./snailCrawl";
import { CUP_SPOT, THERMOS_SPOT } from "./steamWisp";
import { toadOut } from "./toadHop";
import { dogOut } from "./dogMood";

/** Half its width with its wings folded, and its reach from its middle to bill or tail as it turns. */
const HALF_WIDTH = 0.12;
const REACH = 0.22;

describe("mallard on the dock", () => {
  it("comes by day in the rain from spring to fall, when the dog and the toad are not out", () => {
    expect(mallardOut("day", "rain", "summer")).toBe(true);
    expect(mallardOut("day", "rain", "winter")).toBe(false);
    expect(mallardOut("day", "clear", "summer")).toBe(false);
    expect(mallardOut("dusk", "rain", "summer")).toBe(false);
    for (const season of ["spring", "summer", "fall"] as const)
      for (const hour of ["dawn", "day", "dusk", "night"] as const) {
        expect(mallardOut(hour, "rain", season) && dogOut(hour, "rain", season)).toBe(false);
        expect(mallardOut(hour, "rain", season) && toadOut(hour, "rain", season)).toBe(false);
      }
  });

  it("swims in, flaps up, goes in and back, flaps down and swims off, all without jumps", () => {
    let last = mallardAt(0);
    let seen = 0;
    let onBoards = 0;
    for (let t = 0; t < VISIT_EVERY_SEC * 2; t += 1 / 60) {
      const pose = mallardAt(t);
      if (pose.here) {
        seen += 1 / 60;
        if (pose.y >= MALLARD_Y) onBoards += 1 / 60;
        expect(pose.x).toBeLessThan(MALLARD_STOP.x + 0.01);
        if (last.here) {
          expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.05);
          for (const key of ["waddle", "preen", "flap"] as const) expect(Math.abs(pose[key] - last[key])).toBeLessThan(0.3);
          expect(Math.abs(Math.atan2(Math.sin(pose.yaw - last.yaw), Math.cos(pose.yaw - last.yaw)))).toBeLessThan(0.1);
        }
      }
      last = pose;
    }
    expect(seen).toBeGreaterThan(VISIT_SEC * 1.9);
    expect(seen).toBeLessThan(VISIT_SEC * 2 + 0.1);
    expect(onBoards).toBeGreaterThan(20);
  });

  it("appears and goes well out on the water, not at the dock's edge", () => {
    let first = null as ReturnType<typeof mallardAt> | null;
    for (let t = 0; t < VISIT_EVERY_SEC && !first; t += 1 / 60) if (mallardAt(t).here) first = mallardAt(t);
    expect(first!.x).toBeLessThan(DOCK_PLANKS.minX - 1);
    expect(first!.y).toBeLessThan(MALLARD_Y);
  });

  it("stops on the way to preen and to shake off the rain", () => {
    let preening = 0;
    let shaking = 0;
    for (let t = 0; t < VISIT_EVERY_SEC; t += 1 / 30) {
      const pose = mallardAt(t);
      if (pose.preen > 0.5) preening += 1 / 30;
      if (Math.abs(pose.shake) > 0.3) shaking += 1 / 30;
    }
    expect(preening).toBeGreaterThan(3);
    expect(shaking).toBeGreaterThan(0.2);
  });

  it("keeps its body clear of the snail, the thermos and the cup", () => {
    const path = Array.from({ length: 21 }, (_, i) => ({ x: MALLARD_EDGE.x + (MALLARD_STOP.x - MALLARD_EDGE.x) * (i / 20), z: MALLARD_EDGE.z + (MALLARD_STOP.z - MALLARD_EDGE.z) * (i / 20) }));
    for (let t = 0; t < LOOP_SEC; t += 0.5) {
      const snail = snailAt(t);
      for (const p of path) expect(Math.hypot(snail.x - p.x, snail.z - p.z)).toBeGreaterThan(HALF_WIDTH + 0.05);
    }
    // Where it turns round, its bill and tail sweep a circle.
    expect(Math.hypot(THERMOS_SPOT.x - MALLARD_STOP.x, THERMOS_SPOT.z - MALLARD_STOP.z)).toBeGreaterThan(REACH + 0.06);
    expect(Math.hypot(CUP_SPOT.x - MALLARD_STOP.x, CUP_SPOT.z - MALLARD_STOP.z)).toBeGreaterThan(REACH + 0.03);
  });

  it("stands still on the boards with reduced motion", () => {
    expect(mallardAt(3, true)).toEqual(mallardAt(300, true));
    expect(mallardAt(3, true).here).toBe(true);
  });
});
