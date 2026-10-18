import { describe, expect, it } from "vitest";
import { FIRE_AT, PUFF_COUNT, PUFF_RISE_SEC, campfireLit, flicker, smokePuff } from "./campfireSmoke";

const EAST = { x: 0.08, z: 0 };

describe("the campfire by the shack", () => {
  it("burns from dusk to dawn when it is dry", () => {
    expect(campfireLit("dusk", "clear")).toBe(true);
    expect(campfireLit("night", "overcast")).toBe(true);
    expect(campfireLit("dawn", "fog")).toBe(true);
    expect(campfireLit("day", "clear")).toBe(false);
    expect(campfireLit("night", "rain")).toBe(false);
  });

  it("sends its smoke up, growing and thinning as it climbs", () => {
    const low = smokePuff(0, 0.05 * PUFF_RISE_SEC, EAST);
    const high = smokePuff(0, 0.9 * PUFF_RISE_SEC, EAST);
    expect(high.y).toBeGreaterThan(low.y + 1);
    expect(high.size).toBeGreaterThan(low.size);
    expect(high.alpha).toBeLessThan(low.alpha);
  });

  it("leans the smoke downwind, further in a stronger wind", () => {
    const at = (wind: { x: number; z: number }) => smokePuff(3, 0.8 * PUFF_RISE_SEC - (3 / PUFF_COUNT) * PUFF_RISE_SEC, wind).x - FIRE_AT.x;
    expect(at(EAST)).toBeGreaterThan(0.5);
    expect(at({ x: 0.12, z: 0 })).toBeGreaterThan(at(EAST));
    expect(at({ x: -0.08, z: 0 })).toBeLessThan(-0.5);
  });

  it("flickers about full brightness", () => {
    const values = Array.from({ length: 100 }, (_, i) => flicker(i * 0.07));
    expect(Math.min(...values)).toBeGreaterThan(0.65);
    expect(Math.max(...values)).toBeLessThan(1.05);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.1);
    expect(flicker(1.3, true)).toBe(1);
  });
});
