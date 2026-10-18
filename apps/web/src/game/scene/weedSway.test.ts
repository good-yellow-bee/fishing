import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { STRANDS_PER_CLUMP, WEED_CLUMPS, WEED_SWAY, WEED_TALL, strandSway, weedGrowth, weedStrands } from "./weedSway";
import { bedHeight, waterDepth } from "./water";

describe("pondweed round the dock", () => {
  it("shoots in spring, stands full in summer, dies back in fall and is gone in winter", () => {
    expect(weedGrowth("spring")!.height).toBeLessThan(weedGrowth("summer")!.height);
    expect(weedGrowth("fall")!.height).toBeLessThan(weedGrowth("summer")!.height);
    expect(weedGrowth("winter")).toBeNull();
  });

  it("roots every strand in the water, clear of the dock, and never breaks the surface", () => {
    const strands = weedStrands();
    expect(strands.length).toBeGreaterThan(WEED_CLUMPS.length * STRANDS_PER_CLUMP * 0.8);
    for (const strand of strands) {
      expect(waterDepth(strand.x, strand.z)).toBeGreaterThan(0);
      const under = strand.x > DOCK_PLANKS.minX - 0.2 && strand.x < DOCK_PLANKS.maxX + 0.2 && strand.z > DOCK_PLANKS.minZ - 0.2;
      expect(under).toBe(false);
      expect(strand.height).toBeLessThanOrEqual(WEED_TALL);
      expect(bedHeight(strand.x, strand.z) + strand.height).toBeLessThan(-0.15);
    }
  });

  it("rocks with the swell, each strand out of step with its neighbours", () => {
    const [a, b] = weedStrands();
    const swing = Array.from({ length: 200 }, (_, t) => strandSway(a!, t * 0.1).x);
    expect(Math.max(...swing)).toBeGreaterThan(WEED_SWAY * 0.8);
    expect(Math.max(...swing.map(Math.abs))).toBeLessThanOrEqual(WEED_SWAY * 1.25 + 1e-9);
    expect(strandSway(a!, 3).x).not.toBeCloseTo(strandSway(b!, 3).x, 3);
    expect(strandSway(a!, 3, true)).toEqual({ x: 0, z: 0 });
  });
});
