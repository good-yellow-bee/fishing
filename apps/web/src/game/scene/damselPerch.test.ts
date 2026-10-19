import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { DAMSELS, HOVERS, LOOP_SEC, PERCHES, damselAt, damselfliesOut } from "./damselPerch";

const CALM = { x: 0.02, z: 0.01 };

describe("damselflies", () => {
  it("are about on calm, fair summer days", () => {
    expect(damselfliesOut("day", "clear", "summer", CALM)).toBe(true);
    expect(damselfliesOut("day", "overcast", "summer", CALM)).toBe(true);
    expect(damselfliesOut("day", "clear", "summer", { x: 0.1, z: 0 })).toBe(false);
    expect(damselfliesOut("day", "rain", "summer", CALM)).toBe(false);
    expect(damselfliesOut("dusk", "clear", "summer", CALM)).toBe(false);
    expect(damselfliesOut("day", "clear", "spring", CALM)).toBe(false);
  });

  it("each keep to two posts and two hovering spots on their own side of the dock", () => {
    expect(PERCHES.map((posts) => posts.length)).toEqual([2, 2]);
    PERCHES.forEach((posts, side) => posts.forEach((post) => expect(Math.sign(post.x)).toBe(side === 0 ? -1 : 1)));
    HOVERS.flat().forEach((hover) => expect(Math.abs(hover.x)).toBeGreaterThan(DOCK_PLANKS.maxX + 0.5));
  });

  it("settle, dart out, hover and dart back, moving smoothly and never crossing the dock", () => {
    for (let i = 0; i < DAMSELS; i += 1) {
      let last = damselAt(i, 0);
      let settled = 0;
      for (let t = 0.05; t < LOOP_SEC; t += 0.05) {
        const pose = damselAt(i, t);
        expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.2);
        expect(Math.sign(pose.x)).toBe(i === 0 ? -1 : 1);
        expect(pose.y).toBeGreaterThan(0.2);
        if (!pose.flying) settled += 0.05;
        last = pose;
      }
      expect(settled / LOOP_SEC).toBeGreaterThan(0.5);
      expect(settled / LOOP_SEC).toBeLessThan(0.8);
    }
  });

  it("stay settled under reduced motion", () => {
    expect(damselAt(1, 4, true)).toEqual(damselAt(1, 40, true));
    expect(damselAt(1, 4, true).flying).toBe(0);
  });
});
