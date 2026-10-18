import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { CYGNET_COUNT, cygnetPose, cygnetsOut } from "./cygnetBrood";
import { swanPose } from "./swanGlide";

describe("a brood of cygnets", () => {
  it("swims with the swans in summer only", () => {
    expect(cygnetsOut("day", "clear", "summer")).toBe(true);
    expect(cygnetsOut("day", "clear", "spring")).toBe(false);
    expect(cygnetsOut("day", "rain", "summer")).toBe(false);
    expect(cygnetsOut("dusk", "clear", "summer")).toBe(false);
  });

  it("follows behind the second swan, close but never under it, and on the water", () => {
    for (let t = 0; t < 600; t += 7) {
      const tail = swanPose(1, t);
      for (let i = 0; i < CYGNET_COUNT; i += 1) {
        const c = cygnetPose(i, t);
        expect(inLake(c.x, c.z)).toBe(true);
        const off = Math.hypot(c.x - tail.x, c.z - tail.z);
        expect(off).toBeGreaterThan(0.3);
        expect(off).toBeLessThan(5);
      }
      // Strung out in a line: each further back than the one before, measured still.
      const offs = Array.from({ length: CYGNET_COUNT }, (_, i) => {
        const c = cygnetPose(i, t, true);
        return Math.hypot(c.x - tail.x, c.z - tail.z);
      });
      offs.slice(1).forEach((off, i) => expect(off).toBeGreaterThan(offs[i]!));
    }
  });

  it("strays and bobs, except under reduced motion", () => {
    expect(cygnetPose(1, 10).x).not.toBeCloseTo(cygnetPose(1, 10, true).x, 3);
    expect(cygnetPose(1, 10, true).bob).toBe(0);
    const bobs = Array.from({ length: 30 }, (_, t) => cygnetPose(2, t * 0.1).bob);
    expect(Math.max(...bobs) - Math.min(...bobs)).toBeGreaterThan(1);
  });
});
