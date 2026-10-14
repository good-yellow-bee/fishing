import { describe, expect, it } from "vitest";
import { BUTTERFLY_HOMES, butterflyAt, butterfliesOut } from "./butterflyFlit";

describe("butterflies", () => {
  it("come out on sunny summer days only", () => {
    expect(butterfliesOut("day", "clear", "summer")).toBe(true);
    expect(butterfliesOut("day", "partly-cloudy", "summer")).toBe(true);
    expect(butterfliesOut("day", "rain", "summer")).toBe(false);
    expect(butterfliesOut("dusk", "clear", "summer")).toBe(false);
    expect(butterfliesOut("day", "clear", "fall")).toBe(false);
  });

  it("stay low and near their spot", () => {
    for (let i = 0; i < BUTTERFLY_HOMES.length; i += 1) {
      const home = BUTTERFLY_HOMES[i]!;
      for (let t = 0; t < 200; t += 3.7) {
        const b = butterflyAt(i, t);
        expect(Math.hypot(b.x - home.x, b.z - home.z)).toBeLessThan(3.2);
        expect(b.y).toBeGreaterThan(0.3);
        expect(b.y).toBeLessThan(1.1);
        expect(b.flap).toBeGreaterThanOrEqual(0);
        expect(b.flap).toBeLessThanOrEqual(1);
      }
    }
  });

  it("flap fast and keep moving", () => {
    const a = butterflyAt(0, 10);
    const b = butterflyAt(0, 10.1);
    expect(Math.abs(b.flap - a.flap)).toBeGreaterThan(0.05);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0.01);
  });
});
