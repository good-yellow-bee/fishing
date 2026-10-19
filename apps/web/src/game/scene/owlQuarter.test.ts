import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { FIELDS } from "./hayField";
import { LOOP_SEC, barnOwlAt, barnOwlOut } from "./owlQuarter";

describe("barn owl", () => {
  it("hunts the mown fields at dusk from summer into the fall, in dry, clear air", () => {
    expect(barnOwlOut("dusk", "clear", "summer")).toBe(true);
    expect(barnOwlOut("dusk", "overcast", "fall")).toBe(true);
    expect(barnOwlOut("dusk", "rain", "summer")).toBe(false);
    expect(barnOwlOut("dusk", "fog", "fall")).toBe(false);
    expect(barnOwlOut("night", "clear", "summer")).toBe(false);
    expect(barnOwlOut("dusk", "clear", "spring")).toBe(false);
  });

  it("works the fields both ways, low over them and out in front of the hills' face", () => {
    const west = FIELDS[0].x - FIELDS[0].halfX;
    const east = FIELDS[1].x + FIELDS[1].halfX;
    const headings = new Set<number>();
    for (let t = 0; t < LOOP_SEC; t += 0.3) {
      const pose = barnOwlAt(t);
      headings.add(pose.heading);
      expect(pose.x).toBeGreaterThanOrEqual(west);
      expect(pose.x).toBeLessThanOrEqual(east);
      expect(pose.y).toBeLessThan(3.6);
      expect(pose.z).toBeGreaterThan(hillFront(pose.x, pose.y)!);
    }
    expect([...headings].sort()).toEqual([-1, 1]);
  });

  it("stops to hover and drop into the stubble once a pass, and flies on smoothly", () => {
    let down = 0;
    let last = barnOwlAt(0);
    for (let t = 0.1; t < LOOP_SEC; t += 0.1) {
      const pose = barnOwlAt(t);
      if (pose.spread < 1) down += 1;
      expect(Math.abs(pose.x - last.x)).toBeLessThan(0.1);
      expect(Math.abs(pose.y - last.y)).toBeLessThan(0.25);
      last = pose;
    }
    // Two passes, each with its time down in the stubble.
    expect(down).toBeGreaterThan(20);
    expect(down).toBeLessThan(LOOP_SEC);
  });

  it("holds still under reduced motion", () => {
    expect(barnOwlAt(3, true)).toEqual(barnOwlAt(40, true));
  });
});
