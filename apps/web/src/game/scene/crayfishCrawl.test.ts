import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, inLake } from "@stillwater/shared";
import { CRAWL_LAP, CRAYFISH_HOMES, crayfishAt, crayfishOut } from "./crayfishCrawl";
import { waterDepth } from "./water";

describe("crayfish round the dock", () => {
  it("are about from spring to fall, not in winter", () => {
    expect(crayfishOut("spring")).toBe(true);
    expect(crayfishOut("summer")).toBe(true);
    expect(crayfishOut("fall")).toBe(true);
    expect(crayfishOut("winter")).toBe(false);
  });

  it("keep house in the clear shallows, out from under the dock's planks", () => {
    CRAYFISH_HOMES.forEach((_, i) => {
      for (let t = 0; t < CRAWL_LAP * 3; t += 0.25) {
        const { x, z } = crayfishAt(i, t);
        expect(inLake(x, z)).toBe(true);
        expect(waterDepth(x, z)).toBeLessThan(0.45);
        const under = x > DOCK_PLANKS.minX && x < DOCK_PLANKS.maxX && z > DOCK_PLANKS.minZ && z < DOCK_PLANKS.maxZ;
        expect(under).toBe(false);
      }
    });
  });

  it("creep slowly forward, then dart back much faster", () => {
    let creep = 0;
    let dart = 0;
    for (let t = 0; t < CRAWL_LAP * 2; t += 0.05) {
      const a = crayfishAt(0, t);
      const b = crayfishAt(0, t + 0.05);
      const speed = Math.hypot(b.x - a.x, b.z - a.z) / 0.05;
      if (a.darting && b.darting) dart = Math.max(dart, speed);
      else if (!a.darting && !b.darting) creep = Math.max(creep, speed);
    }
    expect(creep).toBeLessThan(0.12);
    expect(dart).toBeGreaterThan(creep * 10);
  });

  it("darts backwards, away from where it faces", () => {
    // The first crayfish's dart runs from 8 s to 8.35 s into each lap.
    const start = crayfishAt(0, 8.02);
    const end = crayfishAt(0, 8.3);
    expect(start.darting && end.darting).toBe(true);
    const moved = { x: end.x - start.x, z: end.z - start.z };
    expect(moved.x * Math.sin(start.yaw) + moved.z * Math.cos(start.yaw)).toBeLessThan(-0.2);
  });

  it("sit still at home under reduced motion", () => {
    expect(crayfishAt(2, 5, true)).toEqual(crayfishAt(2, 50, true));
    expect(crayfishAt(2, 5, true)).toMatchObject({ x: CRAYFISH_HOMES[2]!.x, z: CRAYFISH_HOMES[2]!.z });
  });
});
