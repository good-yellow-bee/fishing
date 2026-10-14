import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { DOCK_DROPS, dockDrop, dockWet } from "./dockWet";

describe("wet dock", () => {
  it("soaks in rain but not in snow or dry weather", () => {
    expect(dockWet(true, "summer")).toBe(true);
    expect(dockWet(true, "winter")).toBe(false);
    expect(dockWet(false, "fall")).toBe(false);
  });

  it("splashes drops on the planks, a few at a time, in fresh spots", () => {
    let live = 0;
    const spots = new Set<string>();
    for (let step = 0; step < 200; step++) {
      const t = step * 0.05;
      for (let i = 0; i < DOCK_DROPS; i++) {
        const drop = dockDrop(i, t);
        expect(drop.x).toBeGreaterThan(DOCK_PLANKS.minX);
        expect(drop.x).toBeLessThan(DOCK_PLANKS.maxX);
        expect(drop.z).toBeGreaterThan(DOCK_PLANKS.minZ);
        expect(drop.z).toBeLessThan(DOCK_PLANKS.maxZ);
        if (drop.age >= 0) {
          expect(drop.age).toBeLessThanOrEqual(1);
          live++;
        }
        spots.add(`${i}:${drop.x.toFixed(3)}`);
      }
    }
    // Roughly a quarter of the drops are splashing at any moment.
    expect(live / (200 * DOCK_DROPS)).toBeGreaterThan(0.1);
    expect(live / (200 * DOCK_DROPS)).toBeLessThan(0.6);
    expect(spots.size).toBeGreaterThan(DOCK_DROPS * 3);
  });
});
