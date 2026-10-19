import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, inLake } from "@stillwater/shared";
import { BREAK_EVERY_SEC, CROSS_SEC, breakDrift, sunBreakAt, sunBreakOut } from "./sunGap";

describe("sun breaks", () => {
  it("come only on overcast days", () => {
    expect(sunBreakOut("day", "overcast")).toBe(true);
    expect(sunBreakOut("day", "clear")).toBe(false);
    expect(sunBreakOut("day", "rain")).toBe(false);
    expect(sunBreakOut("dusk", "overcast")).toBe(false);
  });

  it("drift downwind, and east in still air", () => {
    expect(breakDrift({ x: 0, z: 0 }).x).toBeCloseTo(1);
    const d = breakDrift({ x: 0, z: 1 });
    expect(d.z).toBeGreaterThan(0.9);
  });

  it("slide across the lake, opening and closing gently, and stay off the dock", () => {
    for (const wind of [{ x: 0, z: 0 }, { x: -0.4, z: 0.2 }, { x: 0.1, z: -0.5 }]) {
      let shown = 0;
      let lit = 0;
      let last: ReturnType<typeof sunBreakAt> = null;
      for (let t = 0; t < BREAK_EVERY_SEC * 5; t += 0.2) {
        const sun = sunBreakAt(t, wind);
        if (sun) {
          shown += 1;
          if (sun.strength > 0.5) lit += 1;
          if (sun.strength > 0.01) expect(Math.hypot(sun.x - DOCK_STAND_X, sun.z - DOCK_STAND_Z)).toBeGreaterThan(sun.radius + 1);
          if (last) {
            expect(Math.hypot(sun.x - last.x, sun.z - last.z)).toBeLessThan(0.3);
            expect(Math.abs(sun.strength - last.strength)).toBeLessThan(0.08);
          } else expect(sun.strength).toBeLessThan(0.05);
          if (sun.strength > 0.6) expect(inLake(sun.x, sun.z)).toBe(true);
        }
        last = sun;
      }
      expect(shown * 0.2).toBeGreaterThan(CROSS_SEC * 4);
      expect(lit).toBeGreaterThan(0);
    }
  });

  it("hold one still over the lake with reduced motion", () => {
    expect(sunBreakAt(3, { x: 0, z: 0 }, true)).toEqual(sunBreakAt(70, { x: 0.3, z: 0 }, true));
  });
});
