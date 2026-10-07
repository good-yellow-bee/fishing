import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, footHeight } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  LAND_PRESENT_SEC,
  LAND_SWING_SEC,
  landBodyLean,
  landDrip,
  landDripFall,
  landFishPitch,
  landFishYaw,
  landFlop,
  landHoldPoint,
  landLift,
  landLineOpacity,
  landLineSag,
  landPresent,
  landPresentYaw,
  landRodPitch,
  landSwing,
  placeLandedFish,
} from "./landMotion.ts";

describe("landing", () => {
  it("swings the fish out of the water and into the hand", () => {
    expect(landSwing(0)).toBe(0);
    expect(landSwing(LAND_SWING_SEC)).toBeCloseTo(1);
    expect(landSwing(LAND_SWING_SEC / 2)).toBeGreaterThan(0.2);
    expect(landSwing(LAND_SWING_SEC / 2)).toBeLessThan(0.9);
    let prev = 0;
    for (let i = 1; i <= 10; i += 1) {
      const swing = landSwing((LAND_SWING_SEC * i) / 10);
      expect(swing).toBeGreaterThan(prev);
      prev = swing;
    }
    expect(landLift(0)).toBeCloseTo(0);
    expect(landLift(1)).toBeCloseTo(0);
    expect(landLift(0.45)).toBeGreaterThan(0.7);
    const from = { x: 0.15, y: -0.2, z: 4.2 };
    const hold = { x: 0.3, y: 1.2, z: 6.6 };
    const mid = { x: 0, y: 0, z: 0 };
    const end = { x: 0, y: 0, z: 0 };
    placeLandedFish(mid, from, hold, 0.45);
    placeLandedFish(end, from, hold, 1);
    expect(mid.y).toBeGreaterThan(hold.y);
    expect(end.x).toBeCloseTo(hold.x);
    expect(end.y).toBeCloseTo(hold.y);
    expect(end.z).toBeCloseTo(hold.z);
    for (let i = 1; i < 10; i += 1) {
      placeLandedFish(mid, from, hold, i / 10);
      const overDeck = mid.z >= 5.2 && mid.z <= 8.5 && Math.abs(mid.x) <= 1.05;
      if (overDeck) expect(mid.y).toBeGreaterThan(0.72);
    }
    expect(landPresent(0.2)).toBe(0);
    expect(landPresent(LAND_SWING_SEC + LAND_PRESENT_SEC)).toBeGreaterThan(0.08);
  });

  it("turns into the hand without spinning", () => {
    expect(landFishPitch(0)).toBeLessThan(0);
    expect(landFishPitch(0.5)).toBeLessThan(landFishPitch(0) - 0.4);
    expect(landFishPitch(1)).toBeLessThan(0);
    expect(landFishPitch(1)).toBeGreaterThan(landFishPitch(0.5));
    for (let i = 0; i <= 20; i += 1) {
      const pitch = landFishPitch(i / 20);
      expect(Math.abs(pitch)).toBeLessThan(Math.PI * 0.6);
    }
    const haul = 0;
    const present = landPresentYaw(Math.PI);
    expect(present).toBeCloseTo(-Math.PI / 2);
    expect(landFishYaw(0, haul, present)).toBeCloseTo(haul);
    expect(landFishYaw(1, haul, present)).toBeCloseTo(present);
    expect(Math.abs(landFishYaw(1, haul, present) - landFishYaw(0, haul, present))).toBeLessThan(Math.PI);
  });

  it("hoists the rod, then lowers it as the hand takes the fish", () => {
    const from = 1.25;
    expect(landRodPitch(0, from)).toBeCloseTo(from);
    expect(landRodPitch(0.36, from)).toBeLessThan(0);
    const held = landRodPitch(2, from);
    expect(held).toBeGreaterThan(landRodPitch(0.36, from));
    expect(held).toBeLessThan(0.7);
    expect(landBodyLean(0)).toBeCloseTo(0);
    expect(landBodyLean(LAND_SWING_SEC * 0.45)).toBeLessThan(-0.15);
    const settled = landBodyLean(LAND_SWING_SEC + 0.5);
    expect(settled).toBeLessThan(0);
    expect(settled).toBeGreaterThan(-0.2);
    const atWater = { x: 0, y: 0, z: 0 };
    const shown = { x: 0, y: 0, z: 0 };
    landHoldPoint(atWater, 0, 0, 0, Math.PI, 0);
    landHoldPoint(shown, 0, 0, 0, Math.PI, LAND_SWING_SEC + LAND_PRESENT_SEC);
    expect(atWater.y).toBeGreaterThan(1);
    expect(atWater.x).toBeLessThan(-0.5);
    expect(atWater.z).toBeLessThan(-0.75);
    expect(shown.z).toBeLessThan(-0.75);
    expect(shown.y).toBeGreaterThan(atWater.y);
  });

  it("holds the fish clear of the dock and the chest from the stand", () => {
    const feet = footHeight(DOCK_STAND_X, DOCK_STAND_Z);
    const hold = { x: 0, y: 0, z: 0 };
    landHoldPoint(hold, DOCK_STAND_X, feet, DOCK_STAND_Z, Math.PI, LAND_SWING_SEC + LAND_PRESENT_SEC);
    const dx = hold.x - DOCK_STAND_X;
    const dz = hold.z - DOCK_STAND_Z;
    expect(hold.y).toBeGreaterThan(DOCK_PLANKS.top + 0.9);
    expect(dz).toBeLessThan(-0.7);
    expect(dx).toBeLessThan(-0.5);
    expect(Math.hypot(dx, dz)).toBeGreaterThan(0.7);
  });

  it("keeps a short line on the fish until the hand closes", () => {
    expect(landLineOpacity(0)).toBeGreaterThan(0.5);
    expect(landLineOpacity(0.7)).toBeGreaterThan(0.5);
    expect(landLineOpacity(1)).toBeCloseTo(0);
    expect(landLineSag(0)).toBeLessThan(0.3);
    expect(landLineSag(1)).toBeLessThan(0.05);
    expect(landLineSag(0.5)).toBeLessThan(0.54);
    expect(landFlop(0.2)).toBeGreaterThan(1);
    expect(landFlop(LAND_SWING_SEC + 1.2)).toBeLessThan(landFlop(0.2));
    expect(landDrip(0, 0)).toBe(-1);
    expect(landDrip(0.3, 0)).toBeGreaterThan(0);
    expect(landDripFall(1)).toBeGreaterThan(landDripFall(0.5));
  });
});
