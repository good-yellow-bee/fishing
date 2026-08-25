import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import { anglerLevel, canUseSpot, skillCost } from "./progression.ts";
import { canLand, catchPoints, validateCatch, validateUpgrade } from "./rules.ts";
import type { Profile } from "./types.ts";

const starter: Profile = {
  userId: "u1",
  displayName: "Ash",
  points: 100,
  lifetimePoints: 0,
  strength: 1,
  accuracy: 1,
  patience: 1,
};

describe("progression", () => {
  it("derives angler level from lifetime points", () => {
    expect(anglerLevel(0)).toBe(1);
    expect(anglerLevel(50)).toBe(2);
    expect(anglerLevel(350)).toBe(4);
  });

  it("locks drop-off until level 3", () => {
    expect(canUseSpot("dock", 1)).toBe(true);
    expect(canUseSpot("dropoff", 2)).toBe(false);
    expect(canUseSpot("dropoff", 3)).toBe(true);
  });

  it("prices skill ranks quadratically", () => {
    expect(skillCost(1)).toBe(20);
    expect(skillCost(2)).toBe(80);
  });
});

describe("catch rules", () => {
  it("awards points from weight vs species midpoint", () => {
    const perch = fishById("perch")!;
    const mid = (perch.minWeight + perch.maxWeight) / 2;
    expect(catchPoints(perch, mid)).toBe(perch.basePoints);
  });

  it("rejects a sturgeon on a starter line", () => {
    const result = validateCatch(starter, {
      speciesId: "sturgeon",
      weight: 40,
      spot: "dropoff",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a perch on the dock", () => {
    const result = validateCatch(starter, {
      speciesId: "perch",
      weight: 0.8,
      spot: "dock",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.points).toBeGreaterThan(0);
  });

  it("blocks landing when strength is short", () => {
    const pike = fishById("pike")!;
    expect(canLand(starter, pike)).toBe(false);
  });

  it("covers every challenge id", () => {
    const ids = new Set(FISH.map((fish) => fish.challenge));
    expect(ids).toEqual(new Set(["mash", "timing", "tension", "sequence", "surge"]));
  });

  it("ensures every fish has sensible weights and requirements", () => {
    for (const fish of FISH) {
      expect(fish.minWeight).toBeGreaterThan(0);
      expect(fish.maxWeight).toBeGreaterThan(fish.minWeight);
      expect(fish.minStrength).toBeGreaterThanOrEqual(1);
      expect(fish.minAccuracy).toBeGreaterThanOrEqual(1);
      expect(fish.spots.length).toBeGreaterThan(0);
      expect(fish.basePoints).toBeGreaterThan(0);
    }
  });
});

describe("upgrades", () => {
  it("spends points for the next rank", () => {
    const result = validateUpgrade(starter, "strength");
    expect(result).toEqual({ ok: true, cost: 20, nextRank: 2 });
  });

  it("rejects a broke upgrade", () => {
    const result = validateUpgrade({ ...starter, points: 0 }, "accuracy");
    expect(result.ok).toBe(false);
  });
});
