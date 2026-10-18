import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { NESTS_PER_COLONY, NEST_COLONIES, guardSpot, nestsOut, sunfishNests } from "./sunfishNests";
import { waterDepth } from "./water";

describe("sunfish nests in the shallows", () => {
  it("are fanned in late spring and summer only", () => {
    expect(nestsOut("spring")).toBe(true);
    expect(nestsOut("summer")).toBe(true);
    expect(nestsOut("fall")).toBe(false);
    expect(nestsOut("winter")).toBe(false);
  });

  it("fill each colony on the shallow sandy shelf without overlapping", () => {
    const nests = sunfishNests();
    expect(nests).toHaveLength(NEST_COLONIES.length * NESTS_PER_COLONY);
    expect(sunfishNests()).toEqual(nests);
    for (const nest of nests) {
      expect(inLake(nest.x, nest.z)).toBe(true);
      expect(waterDepth(nest.x, nest.z)).toBeLessThanOrEqual(0.3);
      for (const other of nests) {
        if (other === nest) continue;
        expect(Math.hypot(other.x - nest.x, other.z - nest.z)).toBeGreaterThan(other.radius + nest.radius);
      }
    }
  });

  it("each has a guard hovering over its bed, facing the way it drifts", () => {
    for (const nest of sunfishNests()) {
      for (let t = 0; t < 60; t += 1.7) {
        const guard = guardSpot(nest, t);
        expect(Math.hypot(guard.x - nest.x, guard.z - nest.z)).toBeLessThan(nest.radius);
      }
    }
    const [nest] = sunfishNests();
    const a = guardSpot(nest!, 4);
    const b = guardSpot(nest!, 4.01);
    expect(Math.cos(a.yaw - Math.atan2(b.x - a.x, b.z - a.z))).toBeGreaterThan(0.99);
  });

  it("holds the guard still over the middle for reduced motion", () => {
    const [nest] = sunfishNests();
    expect(guardSpot(nest!, 3, true)).toEqual(guardSpot(nest!, 70, true));
    expect(guardSpot(nest!, 3, true)).toMatchObject({ x: nest!.x, z: nest!.z });
  });
});
