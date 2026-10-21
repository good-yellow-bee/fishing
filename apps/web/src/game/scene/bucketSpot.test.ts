import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, inLake, onDockPlanks, walkableAt } from "@stillwater/shared";
import { DROPOFF_STAND, INLET_STAND, REEDS_STAND } from "./bankWalk";
import { BUCKET_SIDE, bagSpot, bucketSpot, tinSpot } from "./bucketSpot";
import { stakeAt } from "./stakeSpot";
import { CUP_SPOT, THERMOS_SPOT } from "./steamWisp";

describe("the bait bucket at the angler's feet", () => {
  it("stands on the dock's deck beside the angler, clear of the thermos", () => {
    const spot = bucketSpot(DOCK_STAND_X, DOCK_STAND_Z, Math.PI)!;
    expect(onDockPlanks(spot.x, spot.z)).toBe(true);
    expect(spot.y).toBe(DOCK_PLANKS.top);
    expect(Math.hypot(spot.x - THERMOS_SPOT.x, spot.z - THERMOS_SPOT.z)).toBeGreaterThan(0.5);
    expect(Math.hypot(spot.x - DOCK_STAND_X, spot.z - DOCK_STAND_Z)).toBeLessThan(BUCKET_SIDE * 1.5);
  });

  it("stands on dry ground at each bank stand, whichever way the angler faces the water", () => {
    for (const stand of [REEDS_STAND, DROPOFF_STAND, INLET_STAND]) {
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 4) {
        const spot = bucketSpot(stand.x, stand.z, yaw)!;
        expect(spot).not.toBeNull();
        expect(inLake(spot.x, spot.z) && !walkableAt(spot.x, spot.z)).toBe(false);
      }
    }
  });

  it("stands nowhere rather than in the water on the narrow walk out to the dock", () => {
    for (const z of [8.6, 9.1, 9.8, 10.3]) {
      const spot = bucketSpot(0, z, Math.PI);
      if (spot) expect(!inLake(spot.x, spot.z) || walkableAt(spot.x, spot.z)).toBe(true);
    }
    expect(bucketSpot(0, 9.1, Math.PI)).toBeNull();
  });
});

describe("the worm tin at the angler's feet", () => {
  it("stands on the dock's deck beside the angler, clear of the bucket, the thermos and the night line's stake", () => {
    const spot = tinSpot(DOCK_STAND_X, DOCK_STAND_Z, Math.PI)!;
    const stake = stakeAt("dock")!;
    expect(onDockPlanks(spot.x, spot.z)).toBe(true);
    expect(spot.y).toBe(DOCK_PLANKS.top);
    for (const other of [bucketSpot(DOCK_STAND_X, DOCK_STAND_Z, Math.PI)!, THERMOS_SPOT, stake]) {
      expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThan(0.3);
    }
  });

  it("stands on dry ground at each bank stand, never where the bucket stands", () => {
    for (const stand of [REEDS_STAND, DROPOFF_STAND, INLET_STAND]) {
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 4) {
        const spot = tinSpot(stand.x, stand.z, yaw)!;
        const bucket = bucketSpot(stand.x, stand.z, yaw)!;
        expect(spot).not.toBeNull();
        expect(inLake(spot.x, spot.z) && !walkableAt(spot.x, spot.z)).toBe(false);
        expect(Math.hypot(spot.x - bucket.x, spot.z - bucket.z)).toBeGreaterThan(0.2);
      }
    }
  });

  it("stands nowhere rather than in the water on the narrow walk out to the dock", () => {
    for (const z of [8.6, 9.1, 9.8, 10.3]) {
      const spot = tinSpot(0, z, Math.PI);
      if (spot) expect(!inLake(spot.x, spot.z) || walkableAt(spot.x, spot.z)).toBe(true);
    }
    expect(tinSpot(0, 9.1, Math.PI)).toBeNull();
  });

  it("keeps clear of the thermos, its cup and every bank's stake whichever way the angler turns", () => {
    const fixed = [THERMOS_SPOT, CUP_SPOT, ...(["dock", "point", "reeds", "dropoff", "inlet"] as const).map((bank) => stakeAt(bank)!)];
    for (const stand of [{ x: DOCK_STAND_X, z: DOCK_STAND_Z }, REEDS_STAND, DROPOFF_STAND, INLET_STAND]) {
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 16) {
        const spot = tinSpot(stand.x, stand.z, yaw);
        if (spot) for (const other of fixed) expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThanOrEqual(0.25);
      }
    }
  });
});

describe("the groundbait bag at the angler's feet", () => {
  it("sits on the dock's deck beside the bucket, clear of it, the tin, the thermos and the night line's stake", () => {
    const spot = bagSpot(DOCK_STAND_X, DOCK_STAND_Z, Math.PI)!;
    const bucket = bucketSpot(DOCK_STAND_X, DOCK_STAND_Z, Math.PI)!;
    expect(onDockPlanks(spot.x, spot.z)).toBe(true);
    expect(spot.y).toBe(DOCK_PLANKS.top);
    expect(Math.hypot(spot.x - bucket.x, spot.z - bucket.z)).toBeLessThan(0.4);
    for (const other of [bucket, tinSpot(DOCK_STAND_X, DOCK_STAND_Z, Math.PI)!, THERMOS_SPOT, stakeAt("dock")!]) {
      expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThanOrEqual(0.25);
    }
  });

  it("sits on dry ground at each bank stand, never where the bucket or the tin stands", () => {
    for (const stand of [REEDS_STAND, DROPOFF_STAND, INLET_STAND]) {
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 4) {
        const spot = bagSpot(stand.x, stand.z, yaw)!;
        expect(spot).not.toBeNull();
        expect(inLake(spot.x, spot.z) && !walkableAt(spot.x, spot.z)).toBe(false);
        for (const other of [bucketSpot(stand.x, stand.z, yaw)!, tinSpot(stand.x, stand.z, yaw)!]) {
          expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThanOrEqual(0.25);
        }
      }
    }
  });

  it("sits nowhere rather than in the water on the narrow walk out to the dock", () => {
    for (const z of [8.6, 9.1, 9.8, 10.3]) {
      const spot = bagSpot(0, z, Math.PI);
      if (spot) expect(!inLake(spot.x, spot.z) || walkableAt(spot.x, spot.z)).toBe(true);
    }
    expect(bagSpot(0, 9.1, Math.PI)).toBeNull();
  });
});
