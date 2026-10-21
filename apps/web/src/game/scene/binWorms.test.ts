import { describe, expect, it } from "vitest";
import { SPAWN_X, SPAWN_Z } from "@stillwater/shared";
import { BIN_AT, BIN_HALF, BIN_INSIDE, BIN_SACK, BIN_TIN, BIN_WORMS, RISE_MAX, RISE_MIN, TIN_WORM, WORM_LEAN, WORM_REACH, binSnowy, binWorm } from "./binWorms";
import { TIN_CLEAR, bucketSpot, tinSpot } from "./bucketSpot";

describe("the worms in the shack's worm bin", () => {
  it("each comes up at its own spot, far enough in that its tip never reaches a wall", () => {
    const spots = Array.from({ length: BIN_WORMS }, (_, i) => binWorm(i, 0));
    for (const worm of spots) {
      expect(Math.abs(worm.x) + WORM_REACH).toBeLessThan(BIN_INSIDE.width / 2);
      expect(Math.abs(worm.z) + WORM_REACH).toBeLessThan(BIN_INSIDE.depth / 2);
    }
    for (let i = 0; i < spots.length; i += 1)
      for (let j = i + 1; j < spots.length; j += 1) expect(Math.hypot(spots[i]!.x - spots[j]!.x, spots[i]!.z - spots[j]!.z)).toBeGreaterThan(0.05);
  });

  it("rises and sinks back slowly within a small lean, staying at its spot", () => {
    for (let i = 0; i < BIN_WORMS; i += 1) {
      const rises = new Set<number>();
      for (let time = 0; time < 40; time += 0.5) {
        const worm = binWorm(i, time);
        expect(worm.rise).toBeGreaterThanOrEqual(RISE_MIN);
        expect(worm.rise).toBeLessThanOrEqual(RISE_MAX);
        expect(Math.abs(worm.lean)).toBeLessThanOrEqual(WORM_LEAN);
        expect([worm.x, worm.z]).toEqual([binWorm(i, 0).x, binWorm(i, 0).z]);
        rises.add(Math.round(worm.rise * 20));
      }
      expect(rises.size).toBeGreaterThan(5);
    }
  });

  it("keeps each worm out of step with the others", () => {
    for (let i = 0; i < BIN_WORMS; i += 1)
      for (let j = i + 1; j < BIN_WORMS; j += 1) {
        const apart = Array.from({ length: 40 }, (_, k) => Math.abs(binWorm(i, k).rise - binWorm(j, k).rise));
        expect(Math.max(...apart)).toBeGreaterThan(0.2);
      }
  });

  it("lies under snow in winter only", () => {
    expect(binSnowy("winter")).toBe(true);
    for (const season of ["spring", "summer", "fall"] as const) expect(binSnowy(season)).toBe(false);
  });

  it("leaves the angler's keeping tin and the worm over its rim room inside the walls, out of every worm's reach", () => {
    const edge = BIN_TIN.radius + BIN_TIN.lip;
    expect(BIN_TIN.x + edge).toBeLessThan(BIN_INSIDE.width / 2 - 0.002);
    expect(-BIN_TIN.z + edge).toBeLessThan(BIN_INSIDE.depth / 2 - 0.002);
    const tail = { x: BIN_TIN.x + TIN_WORM.x * TIN_WORM.out * BIN_TIN.radius, z: BIN_TIN.z + TIN_WORM.z * TIN_WORM.out * BIN_TIN.radius };
    for (let i = 0; i < BIN_WORMS; i += 1) {
      const worm = binWorm(i, 0);
      expect(Math.hypot(worm.x - BIN_TIN.x, worm.z - BIN_TIN.z)).toBeGreaterThan(edge + WORM_REACH);
      expect(Math.hypot(worm.x - tail.x, worm.z - tail.z)).toBeGreaterThan(WORM_REACH);
    }
  });
});

describe("the worm bin by the shack", () => {
  it("has the bread crumb sack stand off its right wall, in front of the sign's stake", () => {
    expect(BIN_SACK.x - BIN_SACK.radius).toBeGreaterThan(BIN_INSIDE.width / 2 + 0.025);
    expect(BIN_SACK.z - BIN_SACK.radius).toBeGreaterThan(-BIN_INSIDE.depth / 2);
    expect(Math.hypot(BIN_AT.x + BIN_SACK.x - SPAWN_X, BIN_AT.z + BIN_SACK.z - SPAWN_Z)).toBeGreaterThan(BIN_SACK.radius + 0.3);
  });

  it("stands clear of where the angler waits at the shack", () => {
    expect(Math.hypot(BIN_AT.x - SPAWN_X, BIN_AT.z - SPAWN_Z)).toBeGreaterThan(BIN_HALF + 0.3);
  });

  it("never has the bait bucket or the worm tin put down inside it or by its sack", () => {
    for (let dx = -1; dx <= 1; dx += 0.1)
      for (let dz = -1; dz <= 1; dz += 0.1)
        for (let k = 0; k < 8; k += 1) {
          const x = BIN_AT.x + dx;
          const z = BIN_AT.z + dz;
          const yaw = (k * Math.PI) / 4;
          for (const spot of [bucketSpot(x, z, yaw), tinSpot(x, z, yaw)])
            if (spot) {
              expect(Math.hypot(spot.x - BIN_AT.x, spot.z - BIN_AT.z)).toBeGreaterThan(BIN_HALF);
              expect(Math.hypot(spot.x - BIN_AT.x - BIN_SACK.x, spot.z - BIN_AT.z - BIN_SACK.z)).toBeGreaterThanOrEqual(TIN_CLEAR + BIN_SACK.radius - 1e-9);
            }
        }
  });
});
