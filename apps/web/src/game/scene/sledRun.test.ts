import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, lakeEdge } from "@stillwater/shared";
import { LOOP_SEC, RUN_FOOT, RUN_TOP, SLEDDERS, SPRAY_PUFFS, runPoint, sledderAt, sleddersOut, sprayPuff } from "./sledRun";
import { hillFront } from "./farHills";

describe("sledders", () => {
  it("come out on winter days unless it rains or is foggy", () => {
    expect(sleddersOut("day", "clear", "winter")).toBe(true);
    expect(sleddersOut("day", "overcast", "winter")).toBe(true);
    expect(sleddersOut("day", "fog", "winter")).toBe(false);
    expect(sleddersOut("dawn", "clear", "winter")).toBe(false);
    expect(sleddersOut("day", "clear", "fall")).toBe(false);
  });

  it("run down the hill's face, well back from the lake", () => {
    expect(RUN_TOP.y).toBeGreaterThan(RUN_FOOT.y);
    for (let s = 0; s <= 20; s += 1) {
      for (const above of [0, 0.55]) {
        const p = runPoint(s / 20, above);
        expect(hillFront(p.x, p.y)).not.toBeNull();
        expect(inLake(p.x, p.z)).toBe(false);
        const nx = p.x / LAKE_RX;
        const nz = (p.z - LAKE_CENTER_Z) / LAKE_RZ;
        expect(Math.hypot(nx, nz)).toBeGreaterThan(lakeEdge(Math.atan2(-nz, nx)) + 0.2);
      }
    }
  });

  it("slide down, coast to a stop and climb back up without jumps", () => {
    for (let i = 0; i < SLEDDERS; i += 1) {
      let last = sledderAt(i, 0);
      for (let t = 0.05; t < LOOP_SEC * 2; t += 0.05) {
        const pose = sledderAt(i, t);
        expect(Math.abs(pose.along - last.along)).toBeLessThan(0.03);
        expect(Math.abs(pose.above - last.above)).toBeLessThan(0.05);
        expect(pose.along).toBeGreaterThanOrEqual(0);
        expect(pose.along).toBeLessThanOrEqual(1);
        last = pose;
      }
    }
  });

  it("take turns: one is never sliding while the other is", () => {
    for (let t = 0; t < LOOP_SEC; t += 0.25) {
      const moving = [0, 1].filter((i) => sledderAt(i, t).speed > 0);
      expect(moving.length).toBeLessThanOrEqual(1);
    }
  });

  it("kick up snow only while running fast", () => {
    let seen = 0;
    for (let t = 0; t < LOOP_SEC; t += 0.1) {
      for (let j = 0; j < SPRAY_PUFFS; j += 1) {
        const puff = sprayPuff(0, j, t);
        if (!puff) continue;
        seen += 1;
        expect(puff.age).toBeGreaterThanOrEqual(0);
        expect(puff.age).toBeLessThan(1);
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(sprayPuff(0, 0, 1, true)).toBeNull();
  });

  it("hold still with reduced motion", () => {
    expect(sledderAt(0, 3, true)).toEqual(sledderAt(0, 90, true));
    expect(sledderAt(0, 0, true).seated).toBe(true);
    expect(sledderAt(1, 0, true).seated).toBe(false);
  });
});
