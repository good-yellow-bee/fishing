import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { LANTERN_LIGHTS, LANTERNS, lanternFlicker, lanternLevel } from "./lanternLight";

describe("lanterns", () => {
  it("burn only from dusk, brightest at night", () => {
    expect(lanternLevel("dawn")).toBe(0);
    expect(lanternLevel("day")).toBe(0);
    expect(lanternLevel("dusk")).toBeGreaterThan(0);
    expect(lanternLevel("night")).toBe(1);
  });

  it("waver within a narrow band, and hold steady for reduced motion", () => {
    for (let time = 0; time < 20; time += 0.07) {
      const level = lanternFlicker(time, 3);
      expect(level).toBeGreaterThanOrEqual(0.75);
      expect(level).toBeLessThanOrEqual(1);
    }
    expect(lanternFlicker(4.2, 3, true)).toBe(1);
  });

  it("keeps the real lights to two, the dock's over the planks", () => {
    expect(LANTERN_LIGHTS).toHaveLength(2);
    const dock = LANTERN_LIGHTS[0]!;
    expect(dock.x).toBeGreaterThanOrEqual(DOCK_PLANKS.minX);
    expect(dock.x).toBeLessThanOrEqual(DOCK_PLANKS.maxX);
    expect(dock.z).toBeGreaterThanOrEqual(DOCK_PLANKS.minZ);
    expect(dock.z).toBeLessThanOrEqual(DOCK_PLANKS.maxZ);
    expect(LANTERNS.filter((lantern) => !lantern.casts).length).toBeGreaterThan(0);
  });
});
