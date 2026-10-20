import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, inLake, onDockPlanks } from "@stillwater/shared";
import { DROPOFF_STAND, INLET_STAND, REEDS_STAND } from "./bankWalk";
import { BUCKET_SIDE, bucketSpot } from "./bucketSpot";
import { THERMOS_SPOT } from "./steamWisp";

describe("the bait bucket at the angler's feet", () => {
  it("stands on the dock's deck beside the angler, clear of the thermos", () => {
    const spot = bucketSpot(DOCK_STAND_X, DOCK_STAND_Z, Math.PI);
    expect(onDockPlanks(spot.x, spot.z)).toBe(true);
    expect(spot.y).toBe(DOCK_PLANKS.top);
    expect(Math.hypot(spot.x - THERMOS_SPOT.x, spot.z - THERMOS_SPOT.z)).toBeGreaterThan(0.5);
    expect(Math.hypot(spot.x - DOCK_STAND_X, spot.z - DOCK_STAND_Z)).toBeLessThan(BUCKET_SIDE * 1.5);
  });

  it("stands on dry ground at each bank stand, whichever way the angler faces the water", () => {
    for (const stand of [REEDS_STAND, DROPOFF_STAND, INLET_STAND]) {
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 4) {
        const spot = bucketSpot(stand.x, stand.z, yaw);
        expect(inLake(spot.x, spot.z) && spot.y === 0).toBe(false);
      }
    }
  });
});
