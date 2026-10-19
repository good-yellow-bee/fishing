import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { MIDGES_PER_CLOUD, MIDGE_CLOUDS, STILL_AIR, cloudsOverWater, midgeAt, midgesOut } from "./midgeDance";

const STILL = { x: 0.03, z: -0.02 };

describe("dancing midges", () => {
  it("come out on still dry evenings in late spring and summer", () => {
    expect(midgesOut("dusk", "clear", "summer", STILL)).toBe(true);
    expect(midgesOut("dusk", "overcast", "spring", STILL)).toBe(true);
    expect(midgesOut("day", "clear", "summer", STILL)).toBe(false);
    expect(midgesOut("dusk", "rain", "summer", STILL)).toBe(false);
    expect(midgesOut("dusk", "clear", "fall", STILL)).toBe(false);
    expect(midgesOut("dusk", "clear", "summer", { x: STILL_AIR, z: 0 })).toBe(false);
  });

  it("hang their clouds over the water in front of the dock", () => {
    expect(cloudsOverWater()).toBe(true);
    for (const cloud of MIDGE_CLOUDS) expect(cloud.z).toBeLessThan(DOCK_PLANKS.minZ);
  });

  it("keep every midge darting about inside its cloud, above the water, without jumps", () => {
    for (let c = 0; c < MIDGE_CLOUDS.length; c++) {
      for (let i = 0; i < MIDGES_PER_CLOUD; i += 5) {
        let last = midgeAt(c, i, 0, STILL);
        for (let t = 1 / 30; t < 20; t += 1 / 30) {
          const m = midgeAt(c, i, t, STILL);
          const cloud = MIDGE_CLOUDS[c]!;
          expect(Math.hypot(m.x - cloud.x, m.z - cloud.z)).toBeLessThan(0.7);
          expect(m.y).toBeGreaterThan(0.3);
          expect(m.glint).toBeGreaterThan(0.3);
          expect(m.glint).toBeLessThanOrEqual(1);
          expect(Math.hypot(m.x - last.x, m.y - last.y, m.z - last.z)).toBeLessThan(0.15);
          last = m;
        }
      }
    }
  });

  it("holds them still when motion is reduced", () => {
    expect(midgeAt(0, 3, 2, STILL, true)).toEqual(midgeAt(0, 3, 40, STILL, true));
  });
});
