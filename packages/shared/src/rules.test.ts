import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import { fieldGuide, guideProgress } from "./guide.ts";
import { inLake, parseAim, resolveLanding, spotAt } from "./lake.ts";
import { anglerLevel, canUseSpot, skillCost, SPOT_IDS } from "./progression.ts";
import { canLand, catchPoints, legendaryCanBite, validateCatch, validateUpgrade, weightInRange } from "./rules.ts";
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

  it("keeps species ids unique", () => {
    expect(new Set(FISH.map((fish) => fish.id)).size).toBe(FISH.length);
  });

  it("keeps every species at valid spots", () => {
    for (const fish of FISH) {
      for (const spot of fish.spots) expect(SPOT_IDS).toContain(spot);
    }
  });

  it("bounds weight for the new species", () => {
    for (const id of ["golden-shiner", "smallmouth-bass", "burbot", "tiger-muskie"]) {
      const fish = fishById(id)!;
      expect(weightInRange(fish, fish.minWeight)).toBe(true);
      expect(weightInRange(fish, fish.maxWeight)).toBe(true);
      expect(weightInRange(fish, fish.minWeight - 0.01)).toBe(false);
      expect(weightInRange(fish, fish.maxWeight + 0.01)).toBe(false);
    }
  });

  it("scales points with weight around the species midpoint", () => {
    for (const fish of FISH) {
      expect(catchPoints(fish, fish.maxWeight)).toBeGreaterThanOrEqual(fish.basePoints);
      expect(catchPoints(fish, fish.minWeight)).toBeLessThan(catchPoints(fish, fish.maxWeight));
    }
  });

  it("keeps a common species at every spot", () => {
    for (const spot of SPOT_IDS) {
      expect(FISH.some((fish) => fish.rarity === "common" && fish.spots.includes(spot))).toBe(true);
    }
  });

  it("gates tiger muskie bites on angler skill", () => {
    const muskie = fishById("tiger-muskie")!;
    expect(legendaryCanBite(starter, muskie, "reeds")).toBe(false);
    expect(legendaryCanBite({ strength: 5, accuracy: 2 }, muskie, "reeds")).toBe(true);
  });
});

describe("lake spots", () => {
  it("keeps the basin in the lake and the dock deck out", () => {
    expect(inLake(0, -2)).toBe(true);
    expect(inLake(-12, 1)).toBe(true);
    expect(inLake(4, -5)).toBe(true);
    expect(inLake(0, 20)).toBe(false);
  });

  it("maps landing coordinates to spots", () => {
    expect(spotAt(-12, 1)).toBe("reeds");
    expect(spotAt(0.5, 3)).toBe("dock");
    expect(spotAt(4, -5)).toBe("dropoff");
    expect(spotAt(0, 20)).toBe(null);
  });

  it("parses the aim dataset", () => {
    expect(parseAim("4.0,-5.2")).toEqual({ x: 4, z: -5.2 });
    expect(parseAim("none")).toBe(null);
    expect(parseAim(undefined)).toBe(null);
  });

  it("locks drop-off landings before level 3", () => {
    expect(resolveLanding(4, -5, 1)).toEqual({ ok: false, reason: "locked" });
    expect(resolveLanding(4, -5, 3)).toEqual({ ok: true, spot: "dropoff" });
    expect(resolveLanding(-12, 1, 1)).toEqual({ ok: true, spot: "reeds" });
    expect(resolveLanding(0, 20, 3)).toEqual({ ok: false, reason: "shore" });
  });
});

describe("field guide", () => {
  it("keeps unknown species empty", () => {
    const entries = fieldGuide([]);
    expect(guideProgress(entries)).toEqual({ found: 0, total: FISH.length });
    expect(entries.every((entry) => entry.caught === 0 && entry.heaviest === null)).toBe(true);
  });

  it("fills personal bests for logged species", () => {
    const entries = fieldGuide([
      { speciesId: "perch", caught: 2, heaviest: 1.1, lastAt: "2026-09-01T12:00:00.000Z" },
      { speciesId: "unknown-fish", caught: 1, heaviest: 9, lastAt: "2026-09-01T12:00:00.000Z" },
    ]);
    const perch = entries.find((entry) => entry.species.id === "perch")!;
    const shiner = entries.find((entry) => entry.species.id === "golden-shiner")!;
    expect(perch.caught).toBe(2);
    expect(perch.heaviest).toBe(1.1);
    expect(shiner.caught).toBe(0);
    expect(guideProgress(entries).found).toBe(1);
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
