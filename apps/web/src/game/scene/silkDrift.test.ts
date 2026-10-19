import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { CROSS_SEC, THREADS, THREAD_POINTS, gossamerOut, silkOverWater, silkPoint } from "./silkDrift";

const STILL = { x: 0.04, z: 0 };

describe("gossamer threads", () => {
  it("float on fine, still fall mornings and days", () => {
    expect(gossamerOut("dawn", "clear", "fall", STILL)).toBe(true);
    expect(gossamerOut("day", "partly-cloudy", "fall", STILL)).toBe(true);
    expect(gossamerOut("dusk", "clear", "fall", STILL)).toBe(false);
    expect(gossamerOut("day", "overcast", "fall", STILL)).toBe(false);
    expect(gossamerOut("day", "clear", "summer", STILL)).toBe(false);
    expect(gossamerOut("day", "clear", "fall", { x: 0.3, z: 0 })).toBe(false);
  });

  it("drift across open water in front of the dock, above the surface", () => {
    expect(silkOverWater()).toBe(true);
    for (let i = 0; i < THREADS; i++) {
      for (let t = 0; t < CROSS_SEC; t += 2) {
        for (let k = 0; k < THREAD_POINTS; k++) {
          const p = silkPoint(i, k, t);
          expect(p.y).toBeGreaterThan(0.3);
          expect(p.z).toBeLessThan(DOCK_PLANKS.minZ);
        }
      }
    }
  });

  it("move smoothly, fading in and out at the ends of the crossing and glinting now and then", () => {
    let brightest = 0;
    for (let i = 0; i < THREADS; i++) {
      let last = silkPoint(i, 5, 0);
      for (let t = 1 / 30; t < CROSS_SEC * 1.2; t += 1 / 30) {
        const p = silkPoint(i, 5, t);
        brightest = Math.max(brightest, p.glint);
        // A wrap happens while it is faded out.
        if (Math.abs(p.x - last.x) > 1) expect(p.glint + last.glint).toBeLessThan(0.05);
        else expect(Math.hypot(p.x - last.x, p.y - last.y, p.z - last.z)).toBeLessThan(0.05);
        last = p;
      }
    }
    expect(brightest).toBeGreaterThan(0.9);
    expect(silkPoint(2, 3, 1, true)).toEqual(silkPoint(2, 3, 50, true));
  });
});
