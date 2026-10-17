import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import { CAST_RANGE, DROPOFF_PAD, inCastRange, resolveCast, resolveLanding } from "./lake.ts";
import { anglerLevel, anglerTitle, canPreviewFish, showsSolidMark, fishTireMulForLevel, hookWindowMulForLevel, LEVEL_THRESHOLDS, levelProgress, levelUnlock, lureWorkTapsForLevel, perfectCastHalfForLevel, rareBiteMulForLevel } from "./progression.ts";
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

describe("anglerTitle", () => {
  it("gives every level its own title, Greenhorn to Heart of the lake", () => {
    const titles = Array.from({ length: LEVEL_THRESHOLDS.length }, (_, i) => anglerTitle(i + 1));
    expect(titles[0]).toBe("Greenhorn");
    expect(titles.at(-1)).toBe("Heart of the lake");
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("clamps levels outside the ladder", () => {
    expect(anglerTitle(0)).toBe("Greenhorn");
    expect(anglerTitle(99)).toBe("Heart of the lake");
  });
});

describe("levelProgress", () => {
  it("counts the points to the next level and how far through this one the angler is", () => {
    expect(levelProgress(0)).toEqual({ level: 1, next: 2, toNext: 50, share: 0 });
    expect(levelProgress(25)).toEqual({ level: 1, next: 2, toNext: 25, share: 0.5 });
    expect(levelProgress(50)).toEqual({ level: 2, next: 3, toNext: 100, share: 0 });
    expect(levelProgress(3199)).toMatchObject({ level: 7, next: 8, toNext: 1 });
  });

  it("stops at the top level", () => {
    const top = LEVEL_THRESHOLDS.length;
    expect(levelProgress(LEVEL_THRESHOLDS[top - 1]!)).toEqual({ level: top, next: null, toNext: 0, share: 1 });
    expect(levelProgress(1_000_000)).toEqual({ level: top, next: null, toNext: 0, share: 1 });
  });
});

describe("level 2", () => {
  it("marks the solid strike on the Strike card from level 2", () => {
    expect(anglerLevel(50)).toBe(2);
    expect(levelUnlock(2)).toBe("The Strike card marks how long a solid hook lasts.");
    expect(showsSolidMark(1)).toBe(false);
    expect(showsSolidMark(2)).toBe(true);
  });
});

describe("levels 9 and 10", () => {
  it("open at 5000 and 8000 lifetime points, each with its own unlock", () => {
    expect(anglerLevel(4999)).toBe(8);
    expect(anglerLevel(5000)).toBe(9);
    expect(anglerLevel(8000)).toBe(10);
    expect(levelUnlock(9)).toBe("Hooked fish tire 20% faster.");
    expect(levelUnlock(10)).toBe("Rare and legendary fish bite more often.");
    expect(levelProgress(3200)).toMatchObject({ level: 8, next: 9, toNext: 1800 });
  });

  it("tire fish faster from level 9 and draw rarer fish from level 10", () => {
    expect(fishTireMulForLevel(8)).toBe(1);
    expect(fishTireMulForLevel(9)).toBeGreaterThan(1);
    expect(rareBiteMulForLevel(9)).toBe(1);
    expect(rareBiteMulForLevel(10)).toBeGreaterThan(1);
  });
});

describe("levels 11 and 12", () => {
  it("open at 12000 and 17000 lifetime points, each with its own unlock and title", () => {
    expect(anglerLevel(11999)).toBe(10);
    expect(anglerLevel(12000)).toBe(11);
    expect(anglerLevel(17000)).toBe(12);
    expect(levelUnlock(11)).toMatch(/hold the bait/);
    expect(levelUnlock(12)).toMatch(/perfect-cast mark/);
    expect(anglerTitle(11)).toBe("Lake elder");
  });

  it("lets fish hold the bait longer from level 11 and widens the perfect cast from level 12", () => {
    expect(hookWindowMulForLevel(10)).toBe(1);
    expect(hookWindowMulForLevel(11)).toBeGreaterThan(1);
    expect(perfectCastHalfForLevel(11)).toBe(0.035);
    expect(perfectCastHalfForLevel(12)).toBeGreaterThan(0.035);
  });
});

describe("level 13", () => {
  it("opens at 23000 lifetime points with its unlock and title, and works a lure a third time", () => {
    expect(anglerLevel(22999)).toBe(12);
    expect(anglerLevel(23000)).toBe(13);
    expect(levelUnlock(13)).toMatch(/three times/);
    expect(anglerTitle(13)).toBe("Heart of the lake");
    expect(lureWorkTapsForLevel(12)).toBe(2);
    expect(lureWorkTapsForLevel(13)).toBe(3);
  });
});
