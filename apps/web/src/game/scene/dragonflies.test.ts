import { describe, expect, it } from "vitest";
import {
  DART_SEC,
  DRAGONFLY_BEDS,
  DRAGONFLY_COUNT,
  DRAGONFLY_HIGH,
  DRAGONFLY_LOW,
  DRAGONFLY_RANGE,
  dragonfliesOut,
  dragonfly,
} from "./dragonflies";

describe("dragonflies", () => {
  it("come out on dry spring and summer days and evenings only", () => {
    expect(dragonfliesOut("day", "clear", "summer")).toBe(true);
    expect(dragonfliesOut("dusk", "overcast", "spring")).toBe(true);
    expect(dragonfliesOut("day", "rain", "summer")).toBe(false);
    expect(dragonfliesOut("night", "clear", "summer")).toBe(false);
    expect(dragonfliesOut("dawn", "clear", "summer")).toBe(false);
    expect(dragonfliesOut("day", "clear", "fall")).toBe(false);
    expect(dragonfliesOut("day", "clear", "winter")).toBe(false);
  });

  it("stay over their reed bed in the hunting band", () => {
    expect(DRAGONFLY_COUNT).toBe(DRAGONFLY_BEDS.reduce((sum, bed) => sum + bed.flies, 0));
    for (let i = 0; i < DRAGONFLY_COUNT; i++) {
      for (let time = 0; time < 60; time += 0.13) {
        const fly = dragonfly(i, time);
        const nearest = Math.min(...DRAGONFLY_BEDS.map((bed) => Math.hypot(fly.x - bed.x, fly.z - bed.z)));
        expect(nearest).toBeLessThanOrEqual(DRAGONFLY_RANGE + 1e-9);
        expect(fly.y).toBeGreaterThan(DRAGONFLY_LOW - 0.05);
        expect(fly.y).toBeLessThan(DRAGONFLY_HIGH + 0.05);
      }
    }
  });

  it("hover mostly and dart quickly between spots, facing where they go", () => {
    let darting = 0;
    let samples = 0;
    let fastest = 0;
    let slowestHover = 0;
    const step = 0.02;
    for (let time = 0; time < 30; time += step) {
      const a = dragonfly(0, time);
      const b = dragonfly(0, time + step);
      const speed = Math.hypot(b.x - a.x, b.z - a.z) / step;
      samples++;
      if (a.darting && b.darting) {
        darting++;
        fastest = Math.max(fastest, speed);
        if (speed > 0.5) expect(Math.abs(Math.atan2(Math.sin(Math.atan2(b.x - a.x, b.z - a.z) - a.yaw), Math.cos(Math.atan2(b.x - a.x, b.z - a.z) - a.yaw)))).toBeLessThan(1e-6);
      } else if (!a.darting && !b.darting) slowestHover = Math.max(slowestHover, speed);
    }
    expect(darting / samples).toBeLessThan(0.35);
    expect(darting).toBeGreaterThan(0);
    expect(fastest).toBeGreaterThan(3);
    expect(slowestHover).toBe(0);
    expect(DART_SEC).toBeLessThan(0.5);
  });

  it("hold still for reduced motion", () => {
    expect(dragonfly(2, 0, true)).toEqual(dragonfly(2, 17.3, true));
    expect(dragonfly(2, 17.3, true).darting).toBe(false);
  });
});
