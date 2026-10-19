import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { COWS, cowAt, cowsOut } from "./cowGraze";
import { BARN_OFFSET, FARM_AT } from "./farmstead";
import { FIELDS } from "./hayField";

describe("cows", () => {
  it("are out to pasture by day from spring to fall, unless it pours or is foggy", () => {
    expect(cowsOut("day", "clear", "summer")).toBe(true);
    expect(cowsOut("day", "overcast", "spring")).toBe(true);
    expect(cowsOut("day", "rain", "summer")).toBe(false);
    expect(cowsOut("day", "fog", "fall")).toBe(false);
    expect(cowsOut("dusk", "clear", "summer")).toBe(false);
    expect(cowsOut("day", "clear", "winter")).toBe(false);
  });

  it("keep to their own patches of the pasture, out in front of the hills' face", () => {
    COWS.forEach((cow, i) => {
      for (let t = 0; t < 120; t += 0.7) {
        const pose = cowAt(i, t);
        expect(Math.abs(pose.x - cow.x)).toBeLessThanOrEqual(cow.reach + 1e-9);
        expect(pose.z).toBeGreaterThan(hillFront(pose.x, pose.y)!);
      }
    });
  });

  it("graze between the farmstead and the hay fields", () => {
    const west = FARM_AT.x + BARN_OFFSET.x + 0.6;
    const east = FIELDS[0].x - FIELDS[0].halfX;
    for (const cow of COWS) {
      expect(cow.x - cow.reach).toBeGreaterThan(west);
      expect(cow.x + cow.reach).toBeLessThan(east);
    }
  });

  it("amble with their heads up and crop the grass standing still", () => {
    let walked = 0;
    let grazed = 0;
    for (let t = 0; t < 200; t += 0.25) {
      const pose = cowAt(0, t);
      if (pose.stride !== 0) {
        walked += 1;
        expect(pose.graze).toBe(0);
      }
      if (pose.graze > 0.9) grazed += 1;
    }
    expect(walked).toBeGreaterThan(0);
    expect(grazed).toBeGreaterThan(walked);
  });

  it("holds still under reduced motion, heads down", () => {
    expect(cowAt(1, 5, true)).toEqual(cowAt(1, 50, true));
    expect(cowAt(1, 5, true).graze).toBe(1);
  });
});
