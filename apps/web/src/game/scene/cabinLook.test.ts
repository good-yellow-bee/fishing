import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_SEASONS, inLake } from "@stillwater/shared";
import { CABIN_AT, CABIN_SCALE, CABIN_WALLS, CABIN_YAW, CHIMNEY, cabinWindowsLit, chimneySmoking, chimneyTop } from "./cabinLook";

describe("the cabin across the lake", () => {
  it("stands on the far bank, out of the water, facing the lake", () => {
    expect(inLake(CABIN_AT.x, CABIN_AT.z)).toBe(false);
    expect(CABIN_AT.z).toBeLessThan(LAKE_CENTER_Z - 14);
    const toLake = { x: 0 - CABIN_AT.x, z: LAKE_CENTER_Z - CABIN_AT.z };
    expect(Math.cos(Math.atan2(toLake.x, toLake.z) - CABIN_YAW)).toBeCloseTo(1);
  });

  it("lights its windows from dusk through the night", () => {
    expect(cabinWindowsLit("dusk")).toBe(true);
    expect(cabinWindowsLit("night")).toBe(true);
    expect(cabinWindowsLit("dawn")).toBe(false);
    expect(cabinWindowsLit("day")).toBe(false);
  });

  it("keeps the stove going through fall and winter, on spring's cold ends of the day, and never in summer", () => {
    for (const season of LAKE_SEASONS) {
      expect(chimneySmoking("day", season)).toBe(season === "fall" || season === "winter");
      expect(chimneySmoking("night", season)).toBe(season !== "summer");
    }
  });

  it("puts the smoke at the chimney's top, up above the roof's ridge", () => {
    const top = chimneyTop();
    expect(CHIMNEY.top).toBeGreaterThan(CABIN_WALLS.height + CABIN_WALLS.roof);
    expect(top.y).toBeCloseTo(CHIMNEY.top * CABIN_SCALE);
    expect(Math.hypot(top.x - CABIN_AT.x, top.z - CABIN_AT.z)).toBeCloseTo(Math.hypot(CHIMNEY.x, CHIMNEY.z) * CABIN_SCALE);
  });
});
