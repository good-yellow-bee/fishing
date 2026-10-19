import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, inLake } from "@stillwater/shared";
import { DOCK_PELLETS, HAIL_EVERY_SEC, HAIL_SEC, LIE_SEC, WATER_PATCH, WATER_PELLETS, dockPellet, hailOut, hailStrength, waterSpout } from "./hailBurst";

const burst = (from: number) => {
  for (let t = from; t < from + HAIL_EVERY_SEC; t += 0.5) if (hailStrength(t) === 1) return t;
  throw new Error("no burst");
};

describe("hail", () => {
  it("comes with spring and summer rain only", () => {
    expect(hailOut(true, "spring")).toBe(true);
    expect(hailOut(true, "summer")).toBe(true);
    expect(hailOut(false, "summer")).toBe(false);
    expect(hailOut(true, "fall")).toBe(false);
    expect(hailOut(true, "winter")).toBe(false);
  });

  it("falls in short bursts that ease in and out", () => {
    let hailing = 0;
    let last = hailStrength(0);
    for (let t = 0.1; t < HAIL_EVERY_SEC * 2; t += 0.1) {
      const s = hailStrength(t);
      expect(Math.abs(s - last)).toBeLessThan(0.05);
      if (s > 0) hailing += 0.1;
      last = s;
    }
    expect(hailing).toBeGreaterThan(HAIL_SEC * 2 - 1);
    expect(hailing).toBeLessThan(HAIL_SEC * 2 + 1);
  });

  it("drops pellets on the planks that bounce, lie a while and melt away after the burst", () => {
    const peak = burst(0);
    let seen = 0;
    let bouncing = 0;
    for (let i = 0; i < DOCK_PELLETS; i++) {
      const p = dockPellet(i, peak + 3);
      if (!p) continue;
      seen++;
      expect(p.x).toBeGreaterThan(DOCK_PLANKS.minX);
      expect(p.x).toBeLessThan(DOCK_PLANKS.maxX);
      expect(p.z).toBeGreaterThan(DOCK_PLANKS.minZ);
      expect(p.z).toBeLessThan(DOCK_PLANKS.maxZ);
      expect(p.y).toBeGreaterThanOrEqual(DOCK_PLANKS.top);
      if (p.y > DOCK_PLANKS.top + p.size + 0.01) bouncing++;
    }
    expect(seen).toBeGreaterThan(8);
    expect(bouncing).toBeLessThan(seen);
    // Some still lie on the boards just after the burst; all are gone well after it.
    const after = peak + HAIL_SEC;
    expect(Array.from({ length: DOCK_PELLETS }, (_, i) => dockPellet(i, after)).some(Boolean)).toBe(true);
    expect(Array.from({ length: DOCK_PELLETS }, (_, i) => dockPellet(i, after + LIE_SEC + 15)).some(Boolean)).toBe(false);
    expect(dockPellet(0, peak, true)).toBeNull();
  });

  it("kicks up spouts on the water in front of the dock only while it hails", () => {
    const peak = burst(0);
    let spouts = 0;
    for (let s = 0; s < 3; s += 0.1) {
      for (let i = 0; i < WATER_PELLETS; i++) {
        const spout = waterSpout(i, peak + s);
        if (!spout) continue;
        spouts++;
        expect(spout.x).toBeGreaterThanOrEqual(WATER_PATCH.minX);
        expect(spout.z).toBeLessThanOrEqual(WATER_PATCH.maxZ);
        expect(inLake(spout.x, spout.z)).toBe(true);
        expect(spout.height).toBeGreaterThanOrEqual(0);
      }
    }
    expect(spouts).toBeGreaterThan(100);
    const calm = peak + HAIL_SEC + 20;
    expect(Array.from({ length: WATER_PELLETS }, (_, i) => waterSpout(i, calm)).some(Boolean)).toBe(false);
    expect(waterSpout(0, peak, true)).toBeNull();
  });
});
