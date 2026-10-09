import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import { CAST_RANGE, DROPOFF_PAD, inCastRange, resolveCast, resolveLanding } from "./lake.ts";
import { anglerLevel, canPreviewFish, LEVEL_THRESHOLDS } from "./progression.ts";
import { legendaryCanBite, rollWeight } from "./rules.ts";

describe("level unlock boundaries", () => {
  it.each([4, 5, 6, 7, 8])("reaches level %i at its lifetime threshold", (level) => {
    const points = LEVEL_THRESHOLDS[level - 1]!;
    expect(anglerLevel(points - 1)).toBe(level - 1);
    expect(anglerLevel(points)).toBe(level);
  });

  it("opens fish previews at level 4", () => {
    expect(canPreviewFish(3)).toBe(false);
    expect(canPreviewFish(4)).toBe(true);
  });

  it("accepts the longer cast at level 5 and rejects it at level 4", () => {
    const { x, z } = DROPOFF_PAD;
    const aimZ = z - CAST_RANGE * 1.2;
    expect(inCastRange(x, z, x, aimZ, 4)).toBe(false);
    expect(inCastRange(x, z, x, aimZ, 5)).toBe(true);
    expect(resolveCast(x, aimZ, "dropoff", 4, x, z)).toEqual({ ok: false, reason: "range" });
    expect(resolveCast(x, aimZ, "dropoff", 5, x, z)).toEqual({ ok: true, spot: "dropoff" });
    expect(resolveLanding(x, aimZ, 5)).toEqual({ ok: true, spot: "dropoff" });
    expect(inCastRange(x, z, x, z - CAST_RANGE * 1.25, 5)).toBe(true);
    expect(inCastRange(x, z, x, z - CAST_RANGE * 1.25 - 0.01, 5)).toBe(false);
    expect(resolveCast(x, z - CAST_RANGE * 1.26, "dropoff", 5, x, z)).toEqual({ ok: false, reason: "range" });
  });

  it("keeps legendary eligibility based on skill and bank", () => {
    for (const fish of FISH.filter((fish) => fish.rarity === "legendary")) {
      const spot = fish.spots[0]!;
      expect(legendaryCanBite({ strength: 8, accuracy: 8 }, fish, spot)).toBe(true);
      expect(legendaryCanBite({ strength: 1, accuracy: 1 }, fish, spot)).toBe(false);
    }
  });

  it("lifts trophy weights at level 8 and keeps every species within its range", () => {
    const fish = fishById("sturgeon")!;
    const usual = rollWeight(fish, 1, () => 0.5, 7);
    expect(rollWeight(fish, 1, () => 0.5)).toBe(usual);
    expect(rollWeight(fish, 1, () => 0.5, 8)).toBeCloseTo(usual + (fish.maxWeight - fish.minWeight) * 0.1, 1);
    for (const species of FISH) {
      for (const level of [7, 8]) {
        for (const roll of [0, 0.5, 0.9, 1]) {
          const weight = rollWeight(species, 8, () => roll, level);
          expect(weight).toBeGreaterThanOrEqual(species.minWeight);
          expect(weight).toBeLessThanOrEqual(species.maxWeight);
        }
      }
      expect(rollWeight(species, 8, () => 1, 8)).toBe(species.maxWeight);
    }
  });
});
