import { describe, expect, it } from "vitest";
import { LAKE_SEASONS, SHOP_X, SHOP_Z } from "@stillwater/shared";
import { FIRE_AT } from "./campfireSmoke";
import { FIRESIDE_AT } from "./catNap";
import { BIRD_COUNT, FEEDER_AT, ROOST, TRAY_Y, VISIT_SEC, chickadeeAt, chickadeesOut, feederUp } from "./feederVisits";
import { SNOWMAN_AT } from "./snowmanLook";

describe("the winter bird feeder", () => {
  it("goes up only in winter, and the chickadees come by day when it is dry", () => {
    for (const season of LAKE_SEASONS) expect(feederUp(season)).toBe(season === "winter");
    expect(chickadeesOut("day", "clear")).toBe(true);
    expect(chickadeesOut("dawn", "overcast")).toBe(true);
    expect(chickadeesOut("dusk", "clear")).toBe(false);
    expect(chickadeesOut("night", "clear")).toBe(false);
    expect(chickadeesOut("day", "rain")).toBe(false);
  });

  it("stands by the shack, clear of the campfire, the cat's seat by it and the snowman", () => {
    const from = (spot: { x: number; z: number }) => Math.hypot(FEEDER_AT.x - spot.x, FEEDER_AT.z - spot.z);
    expect(from({ x: SHOP_X, z: SHOP_Z })).toBeLessThan(3.5);
    expect(from(FIRE_AT)).toBeGreaterThan(1);
    expect(from(FIRESIDE_AT)).toBeGreaterThan(0.8);
    expect(from(SNOWMAN_AT)).toBeGreaterThan(2);
  });

  it("sends each bird to the tray to peck, off to the tree and back", () => {
    for (let i = 0; i < BIRD_COUNT; i += 1) {
      const poses = Array.from({ length: VISIT_SEC * 20 }, (_, k) => chickadeeAt(i, k / 20));
      const perched = poses.filter((pose) => !pose.away && pose.flying === 0);
      expect(perched.length).toBeGreaterThan(poses.length / 3);
      for (const pose of perched) {
        expect(pose.y).toBeCloseTo(TRAY_Y + 0.04);
        expect(Math.hypot(pose.x - FEEDER_AT.x, pose.z - FEEDER_AT.z)).toBeLessThan(0.25);
      }
      expect(perched.some((pose) => pose.peck > 0.5)).toBe(true);
      expect(poses.some((pose) => pose.flying === 1)).toBe(true);
      expect(poses.some((pose) => pose.away)).toBe(true);
      for (const pose of poses.filter((p) => p.away)) expect(pose.y).toBe(ROOST.y);
    }
  });

  it("keeps the birds out of step, so someone is usually at the tray", () => {
    let busy = 0;
    for (let k = 0; k < 200; k += 1) {
      const t = (k / 200) * VISIT_SEC;
      if (Array.from({ length: BIRD_COUNT }, (_, i) => chickadeeAt(i, t)).some((pose) => !pose.away && pose.flying === 0)) busy += 1;
    }
    expect(busy).toBeGreaterThan(150);
  });
});
