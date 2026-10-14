import { describe, expect, it } from "vitest";
import { MOTH_COUNT, MOTH_LAMPS, MOTHS_PER_LANTERN, mothAt, mothsOut } from "./mothOrbit";

describe("lantern moths", () => {
  it("come out when the lanterns are lit, but not in winter", () => {
    expect(mothsOut("night", "summer")).toBe(true);
    expect(mothsOut("dusk", "fall")).toBe(true);
    expect(mothsOut("day", "summer")).toBe(false);
    expect(mothsOut("night", "winter")).toBe(false);
  });

  it("circle close round their own lantern", () => {
    expect(MOTH_LAMPS.length).toBeGreaterThan(1);
    for (let i = 0; i < MOTH_COUNT; i += 1) {
      const lamp = MOTH_LAMPS[Math.floor(i / MOTHS_PER_LANTERN)]!;
      for (let t = 0; t < 60; t += 1.7) {
        const moth = mothAt(i, t);
        const reach = Math.hypot(moth.x - lamp.x, moth.z - lamp.z);
        expect(reach).toBeLessThan(0.45);
        expect(reach).toBeGreaterThan(0.1);
        expect(Math.abs(moth.y - lamp.y - 0.12)).toBeLessThan(0.25);
      }
    }
  });

  it("keep moving and beating their wings", () => {
    const a = mothAt(0, 3);
    const b = mothAt(0, 3.05);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0.01);
    expect(a.flap).toBeGreaterThanOrEqual(0);
    expect(a.flap).toBeLessThanOrEqual(1);
  });
});
