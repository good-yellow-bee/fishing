import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { PUFFS, WISPS, WISP_LIFE_SEC, lakeSmokeOut, smokePuffAt, wispHome } from "./lakeSteam";

const BREEZE = { x: 0.03, z: 0.01 };
const GALE = { x: -0.2, z: 0.1 };

describe("lake smoke", () => {
  it("rises off the lake on clear or overcast dawns in fall and winter", () => {
    expect(lakeSmokeOut("dawn", "clear", "fall")).toBe(true);
    expect(lakeSmokeOut("dawn", "overcast", "winter")).toBe(true);
    expect(lakeSmokeOut("dawn", "fog", "fall")).toBe(false);
    expect(lakeSmokeOut("day", "clear", "winter")).toBe(false);
    expect(lakeSmokeOut("dawn", "clear", "summer")).toBe(false);
  });

  it("rises from open water on the far side of the dock, somewhere new each time", () => {
    for (let i = 0; i < WISPS; i++)
      for (let round = 0; round < 6; round++) {
        const home = wispHome(i, round);
        expect(inLake(home.x, home.z)).toBe(true);
        expect(home.z).toBeLessThan(1.5);
      }
    expect(wispHome(3, 0)).not.toEqual(wispHome(3, 1));
  });

  it("stays over the water, rising and thinning smoothly through each life", () => {
    for (let i = 0; i < WISPS; i += 3)
      for (let t = 0; t < WISP_LIFE_SEC * 3; t += 1 / 20) {
        for (let k = 0; k < PUFFS; k++) {
          expect(inLake(smokePuffAt(i, k, t, GALE).x, smokePuffAt(i, k, t, GALE).z)).toBe(true);
          const a = smokePuffAt(i, k, t, BREEZE);
          expect(inLake(a.x, a.z)).toBe(true);
          expect(a.alpha).toBeGreaterThanOrEqual(0);
          expect(a.alpha).toBeLessThan(0.41);
          const b = smokePuffAt(i, k, t + 1 / 20, BREEZE);
          // Within a life it moves a little at a time; between lives it is too faint to see.
          if (a.alpha > 0.02 && b.alpha > 0.02) expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.2);
        }
      }
  });

  it("holds each wisp half risen with reduced motion", () => {
    expect(smokePuffAt(4, 1, 3, BREEZE, true)).toEqual(smokePuffAt(4, 1, 80, BREEZE, true));
    expect(smokePuffAt(4, 0, 3, BREEZE, true).alpha).toBeGreaterThan(0.1);
  });
});
