import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, lakeEdge } from "@stillwater/shared";
import { walkPath } from "./dogWalk";
import { MAX_SKIPS, RING_SEC, SKIMMER_AT, SKIM_ROUND_SEC, skimOut, skimRings, skimmerAt, stoneAt } from "./skimStones";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.01;
}

describe("skimming stones from the far bank", () => {
  it("happens by day from spring to fall on calm, dry, clear days", () => {
    const light = { x: 0.04, z: 0 };
    expect(skimOut("day", "clear", "summer", light)).toBe(true);
    expect(skimOut("day", "overcast", "fall", light)).toBe(true);
    expect(skimOut("day", "clear", "winter", light)).toBe(false);
    expect(skimOut("day", "rain", "summer", light)).toBe(false);
    expect(skimOut("dusk", "clear", "summer", light)).toBe(false);
    expect(skimOut("day", "clear", "summer", { x: 0.13, z: 0 })).toBe(false);
  });

  it("stands at the water's edge on the far bank, clear of the dog walker's path", () => {
    expect(onLand(SKIMMER_AT)).toBe(true);
    expect(SKIMMER_AT.z).toBeLessThan(LAKE_CENTER_Z - LAKE_RZ * 0.8);
    const path = Array.from({ length: 81 }, (_, i) => walkPath(i / 80));
    expect(Math.min(...path.map((p) => Math.hypot(p.x - SKIMMER_AT.x, p.z - SKIMMER_AT.z)))).toBeGreaterThan(1);
  });

  it("skips each stone out over the water in shrinking hops, touching down only on the lake", () => {
    let last = stoneAt(0);
    let throws = 0;
    let lastRings = 0;
    for (let t = 0.01; t < SKIM_ROUND_SEC; t += 0.01) {
      const stone = stoneAt(t);
      if (stone && last) expect(Math.hypot(stone.x - last.x, stone.y - last.y, stone.z - last.z)).toBeLessThan(0.12);
      if (stone) expect(stone.y).toBeGreaterThanOrEqual(-1e-9);
      if (stone && !last) throws += 1;
      const rings = skimRings(t);
      expect(rings.length).toBeLessThanOrEqual(MAX_SKIPS + 1);
      for (const ring of rings) {
        expect(inLake(ring.x, ring.z)).toBe(true);
        expect(ring.age).toBeGreaterThanOrEqual(0);
        expect(ring.age).toBeLessThanOrEqual(1);
      }
      lastRings = Math.max(lastRings, rings.length);
      last = stone;
    }
    expect(throws).toBe(4);
    expect(lastRings).toBeGreaterThanOrEqual(5);
    expect(RING_SEC).toBeGreaterThan(1);
  });

  it("moves the child smoothly: a stoop for a stone, then a wind-back and a sidearm sling", () => {
    let last = skimmerAt(0);
    let stooped = false;
    let slung = false;
    for (let t = 0.01; t < SKIM_ROUND_SEC; t += 0.01) {
      const pose = skimmerAt(t);
      expect(Math.abs(pose.stoop - last.stoop)).toBeLessThan(0.05);
      expect(Math.abs(pose.sling - last.sling)).toBeLessThan(0.25);
      expect(Math.abs(pose.lift - last.lift)).toBeLessThan(0.1);
      // The arm is out to the side at least as far as it is swung, so it never drops mid-throw.
      expect(pose.lift).toBeGreaterThanOrEqual(Math.min(1, Math.abs(pose.sling)) - 1e-9);
      if (pose.stoop > 0.95) stooped = true;
      if (pose.sling > 0.95) slung = true;
      last = pose;
    }
    expect(stooped && slung).toBe(true);
  });

  it("holds still with no stone flying under reduced motion", () => {
    expect(skimmerAt(1, true)).toEqual(skimmerAt(30, true));
    expect(stoneAt(1, true)).toBeNull();
    expect(skimRings(5, true)).toEqual([]);
  });
});
