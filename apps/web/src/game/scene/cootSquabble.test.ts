import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { canoeRoute } from "./canoeTrip";
import { COOT_COUNT, SQUABBLE_EVERY_SEC, cootAt, cootsOut } from "./cootSquabble";

const inWater = (x: number, z: number, margin: number) => {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) < lakeEdge(Math.atan2(-nz, nx)) - margin;
};

describe("coots", () => {
  it("are on the water from dawn to dusk, spring to fall", () => {
    expect(cootsOut("dawn", "spring")).toBe(true);
    expect(cootsOut("dusk", "fall")).toBe(true);
    expect(cootsOut("night", "summer")).toBe(false);
    expect(cootsOut("day", "winter")).toBe(false);
  });

  it("stay out on the water, clear of the canoe's route, and never run into each other", () => {
    const route = Array.from({ length: 101 }, (_, k) => canoeRoute(k / 100));
    for (const squabbling of [true, false])
      for (let t = 0; t < 600; t += 0.23) {
        const a = cootAt(0, t, squabbling);
        const b = cootAt(1, t, squabbling);
        for (const c of [a, b]) {
          expect(inWater(c.x, c.z, 0.05)).toBe(true);
          expect(Math.min(...route.map((r) => Math.hypot(r.x - c.x, r.z - c.z)))).toBeGreaterThan(1.2);
        }
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.3);
      }
  });

  it("move smoothly, and dive without the dive being cut short", () => {
    for (let i = 0; i < COOT_COUNT; i++) {
      let dives = 0;
      for (let t = 0; t < 400; t += 0.05) {
        const a = cootAt(i, t, true);
        const b = cootAt(i, t + 0.05, true);
        expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.15);
        expect(Math.abs(b.under - a.under)).toBeLessThan(0.35);
        if (a.under === 0 && b.under > 0) dives++;
      }
      expect(dives).toBeGreaterThan(5);
    }
  });

  it("squabble in spring only, the chaser pattering after the one that runs", () => {
    let patters = 0;
    for (let t = 0; t < SQUABBLE_EVERY_SEC; t += 0.1) {
      expect(cootAt(0, t, false).patter).toBe(0);
      const chaser = cootAt(1, t, true);
      const fleer = cootAt(0, t, true);
      if (chaser.patter > 0.5) patters++;
      if (chaser.patter > 0) expect(fleer.under).toBe(0);
    }
    expect(patters).toBeGreaterThan(5);
  });

  it("hold still with reduced motion", () => {
    expect(cootAt(1, 4, true, true)).toEqual(cootAt(1, 77, true, true));
  });
});
