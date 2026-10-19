import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { FIELDS, hayBales } from "./hayField";
import { LOOP_SEC, RUN_EAST, RUN_WEST, tractorAt, tractorOut } from "./tractorRun";

describe("tractor", () => {
  it("works the field on dry summer days", () => {
    expect(tractorOut("day", "clear", "summer")).toBe(true);
    expect(tractorOut("day", "overcast", "summer")).toBe(true);
    expect(tractorOut("day", "rain", "summer")).toBe(false);
    expect(tractorOut("dusk", "clear", "summer")).toBe(false);
    expect(tractorOut("day", "clear", "fall")).toBe(false);
  });

  it("keeps to the western field, in front of the hills' face, turning smoothly at the ends", () => {
    const field = FIELDS[0];
    let last = tractorAt(0);
    for (let t = 0.1; t < LOOP_SEC; t += 0.1) {
      const pose = tractorAt(t);
      expect(pose.x).toBeGreaterThan(field.x - field.halfX);
      expect(pose.x).toBeLessThan(field.x + field.halfX);
      expect(pose.z).toBeGreaterThan(hillFront(pose.x, pose.y)!);
      expect(Math.abs(pose.x - last.x)).toBeLessThan(0.1);
      expect(Math.abs(pose.yaw - last.yaw)).toBeLessThan(0.2);
      last = pose;
    }
    expect(tractorAt(0).x).toBeCloseTo(RUN_WEST);
    expect(tractorAt(LOOP_SEC / 2 - 0.001).x).toBeCloseTo(RUN_EAST, 1);
  });

  it("drives along between the rows of bales, clear of them", () => {
    const bales = hayBales().filter((bale) => Math.abs(bale.x - FIELDS[0].x) < FIELDS[0].halfX);
    for (let t = 0; t < LOOP_SEC; t += 0.5) {
      const pose = tractorAt(t);
      for (const bale of bales) expect(Math.hypot(pose.x - bale.x, pose.y - bale.y)).toBeGreaterThan(0.3);
    }
  });

  it("holds still under reduced motion", () => {
    expect(tractorAt(3, true)).toEqual(tractorAt(90, true));
  });
});
