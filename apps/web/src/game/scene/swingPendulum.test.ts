import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FIRE_AT } from "./campfireSmoke";
import { FIRESIDE_AT, NAP_AT } from "./catNap";
import { COVER, GRAZE } from "./hareRounds";
import { BLOCK_AT, WOODPILE_AT } from "./woodStack";
import { PATCHES } from "./meadowFlowers";
import { PUDDLES } from "./rainPuddles";
import { ROPE_LENGTH, ROPE_TOP, SWING_AT, SWING_SEC, TYRE_LOW, TYRE_R, swingAngles, tyreSnowy } from "./swingPendulum";

describe("tyre swing", () => {
  it("hangs the tyre clear of the grass on a rope from high in the tree", () => {
    expect(ROPE_LENGTH).toBeGreaterThan(1);
    expect(ROPE_TOP - ROPE_LENGTH - TYRE_R * 2).toBeCloseTo(TYRE_LOW);
    expect(TYRE_LOW).toBeGreaterThan(0.2);
  });

  it("hangs over dry land, clear of the fire, the cat, the hare, the woodpile, the flowers and the puddles", () => {
    expect(inLake(SWING_AT.x, SWING_AT.z)).toBe(false);
    for (const spot of [FIRE_AT, FIRESIDE_AT, NAP_AT, COVER, ...GRAZE, WOODPILE_AT, BLOCK_AT]) expect(Math.hypot(SWING_AT.x - spot.x, SWING_AT.z - spot.z)).toBeGreaterThan(0.9);
    for (const patch of PATCHES) expect(Math.hypot(SWING_AT.x - patch.x, SWING_AT.z - patch.z)).toBeGreaterThan(patch.r + TYRE_R);
    for (const puddle of PUDDLES) expect(Math.hypot(SWING_AT.x - puddle.x, SWING_AT.z - puddle.z)).toBeGreaterThan(puddle.rx + TYRE_R);
  });

  it("rocks on a pendulum's beat for its rope", () => {
    expect(SWING_SEC).toBeGreaterThan(2);
    expect(SWING_SEC).toBeLessThan(4);
  });

  it("swings further on a windy day, and out downwind", () => {
    const reach = (wind: { x: number; z: number }) => {
      let most = 0;
      for (let t = 0; t < 60; t += 0.1) {
        const turn = swingAngles(t, wind);
        most = Math.max(most, Math.hypot(turn.x, turn.z));
      }
      return most;
    };
    expect(reach({ x: 0.12, z: 0 })).toBeGreaterThan(reach({ x: 0.01, z: 0 }) * 2);
    expect(reach({ x: 0.5, z: 0.5 })).toBeLessThan(0.4);
    // Averaged over its swings, a wind toward +x leaves it leaning toward +x: a positive turn about z.
    let sum = 0;
    for (let t = 0; t < 60; t += 0.1) sum += swingAngles(t, { x: 0.12, z: 0 }).z;
    expect(sum).toBeGreaterThan(0);
  });

  it("hangs still for reduced motion, and wears snow in winter", () => {
    expect(swingAngles(5, { x: 0.1, z: 0.1 }, true)).toEqual({ x: 0, z: 0 });
    expect(tyreSnowy("winter")).toBe(true);
    expect(tyreSnowy("summer")).toBe(false);
  });
});
