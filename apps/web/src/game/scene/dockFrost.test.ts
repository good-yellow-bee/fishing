import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { FROST_PALE, FROST_SHEETS, SNOW_PALE, dockFrost, frostPrints, frostSpecks, sheetUv, walkwayPale } from "./dockFrost";

describe("hoar frost on the dock", () => {
  it("lies only at dawn after a clear night, thickest in fall", () => {
    expect(dockFrost("dawn", "fall", "clear")).toBe(1);
    expect(dockFrost("dawn", "spring", "clear")).toBeGreaterThan(0);
    expect(dockFrost("dawn", "spring", "clear")).toBeLessThan(1);
    expect(dockFrost("day", "fall", "clear")).toBe(0);
    expect(dockFrost("dusk", "fall", "clear")).toBe(0);
    expect(dockFrost("dawn", "fall", "overcast")).toBe(0);
    expect(dockFrost("dawn", "fall", "rain")).toBe(0);
    expect(dockFrost("dawn", "fall", "fog")).toBe(0);
  });

  it("never forms in summer, nor in winter, which has its snow", () => {
    expect(dockFrost("dawn", "summer", "clear")).toBe(0);
    expect(dockFrost("dawn", "winter", "clear")).toBe(0);
  });

  it("sparkles all over the planks", () => {
    const specks = frostSpecks();
    for (const s of specks) {
      expect(s.u).toBeGreaterThanOrEqual(0);
      expect(s.u).toBeLessThanOrEqual(1);
      expect(s.v).toBeGreaterThanOrEqual(0);
      expect(s.v).toBeLessThanOrEqual(1);
    }
    expect(specks.filter((s) => s.u < 0.5).length).toBeGreaterThan(specks.length * 0.4);
    expect(specks.filter((s) => s.v < 0.5).length).toBeGreaterThan(specks.length * 0.4);
  });

  it("melts back to bare wood under the angler's prints along the walkway", () => {
    for (const sheet of FROST_SHEETS) {
      const prints = frostPrints(sheet);
      expect(prints.length).toBeGreaterThan(2);
      for (const p of prints) {
        expect(p.u).toBeGreaterThan(0.1);
        expect(p.u).toBeLessThan(0.9);
        expect(p.v).toBeGreaterThan(0);
        expect(p.v).toBeLessThan(1);
      }
    }
    expect(sheetUv(DOCK_PLANKS, DOCK_PLANKS.minX, DOCK_PLANKS.maxZ)).toEqual({ u: 0, v: 1 });
    // The trail runs the length of the walkway, out toward the dock.
    const trail = frostPrints(FROST_SHEETS[0]!).map((p) => p.v);
    expect(Math.max(...trail) - Math.min(...trail)).toBeGreaterThan(0.6);
  });

  it("frosts the walkway from where the dock ends, without overlapping it", () => {
    const [walk] = FROST_SHEETS;
    expect(walk!.rect.minZ).toBe(DOCK_PLANKS.maxZ);
    expect(walk!.rect.maxZ).toBeGreaterThan(walk!.rect.minZ + 1);
  });

  it("pales the walkway's boards under winter's snow, and by the frost's thickness otherwise", () => {
    expect(walkwayPale("winter", 0)).toBe(SNOW_PALE);
    expect(walkwayPale("fall", 1)).toBe(FROST_PALE);
    expect(walkwayPale("spring", 0.6)).toBeCloseTo(0.6 * FROST_PALE);
    expect(walkwayPale("summer", 0)).toBe(0);
    expect(SNOW_PALE).toBeGreaterThan(FROST_PALE);
  });
});
