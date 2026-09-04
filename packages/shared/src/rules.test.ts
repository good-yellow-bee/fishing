import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import { BOARD_LIMIT, boardView, rankBoard, type BoardStat } from "./board.ts";
import { fieldGuide, guideProgress, catchStamp } from "./guide.ts";
import { biteHourMul, lakeHour, lakeHourFromSearch, lakeHourWaitMul } from "./hour.ts";
import {
  DOCK_PAD,
  DROPOFF_PAD,
  REEDS_PAD,
  SHOP_X,
  SHOP_Z,
  SPAWN_X,
  SPAWN_Z,
  inCastRange,
  inLake,
  parseAim,
  parseStance,
  resolveCast,
  resolveLanding,
  spotAt,
  stanceAt,
  walkableAt,
} from "./lake.ts";
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
      expect(fish.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(fish.accent).toMatch(/^#[0-9a-f]{6}$/i);
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

  it("lets the dock sit on water and keeps the basin unwadeable", () => {
    expect(inLake(DOCK_PAD.x, DOCK_PAD.z)).toBe(true);
    expect(walkableAt(DOCK_PAD.x, DOCK_PAD.z)).toBe(true);
    expect(walkableAt(SPAWN_X, SPAWN_Z)).toBe(true);
    expect(inLake(SPAWN_X, SPAWN_Z)).toBe(false);
    expect(walkableAt(0, -2)).toBe(false);
  });

  it("maps pads to shop, dock, reeds, and drop-off", () => {
    expect(stanceAt(SPAWN_X, SPAWN_Z)).toBe("shop");
    expect(stanceAt(SHOP_X, SHOP_Z)).toBe("shop");
    expect(stanceAt(DOCK_PAD.x, DOCK_PAD.z)).toBe("dock");
    expect(stanceAt(REEDS_PAD.x, REEDS_PAD.z)).toBe("reeds");
    expect(stanceAt(DROPOFF_PAD.x, DROPOFF_PAD.z)).toBe("dropoff");
    expect(stanceAt(5, 12)).toBe("trail");
    expect(parseStance("shop")).toBe("shop");
    expect(parseStance("none")).toBe(null);
  });

  it("needs a matching bank and range to cast", () => {
    expect(inCastRange(DOCK_PAD.x, DOCK_PAD.z, 0.5, 3)).toBe(true);
    expect(inCastRange(DOCK_PAD.x, DOCK_PAD.z, -12, 1)).toBe(false);
    expect(resolveCast(0.5, 3, "dock", 1, DOCK_PAD.x, DOCK_PAD.z)).toEqual({ ok: true, spot: "dock" });
    expect(resolveCast(-12, 1, "dock", 1, DOCK_PAD.x, DOCK_PAD.z)).toEqual({ ok: false, reason: "range" });
    expect(resolveCast(-10, 4, "dock", 1, DOCK_PAD.x, DOCK_PAD.z)).toEqual({ ok: false, reason: "basin" });
    expect(resolveCast(-12, 1, "reeds", 1, REEDS_PAD.x, REEDS_PAD.z)).toEqual({ ok: true, spot: "reeds" });
    expect(resolveCast(15, -2, "dropoff", 1, DROPOFF_PAD.x, DROPOFF_PAD.z)).toEqual({ ok: false, reason: "locked" });
    expect(resolveCast(15, -2, "dropoff", 3, DROPOFF_PAD.x, DROPOFF_PAD.z)).toEqual({ ok: true, spot: "dropoff" });
    expect(resolveCast(0.5, 3, "shop", 3, SPAWN_X, SPAWN_Z)).toEqual({ ok: false, reason: "stance" });
    expect(resolveCast(0, 20, "dock", 3, DOCK_PAD.x, DOCK_PAD.z)).toEqual({ ok: false, reason: "shore" });
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

  it("stamps a first, a personal best, or a repeat", () => {
    expect(catchStamp([], "perch", 0.8)).toEqual({ kind: "first" });
    expect(catchStamp([{ speciesId: "perch", caught: 2, heaviest: 0.9, lastAt: "x" }], "perch", 1.1)).toEqual({
      kind: "pb",
      previous: 0.9,
    });
    expect(catchStamp([{ speciesId: "perch", caught: 2, heaviest: 1.1, lastAt: "x" }], "perch", 0.8)).toEqual({
      kind: "repeat",
      heaviest: 1.1,
    });
  });
});

describe("lake hour", () => {
  const at = (hour: number) => new Date(2026, 8, 2, hour, 0, 0);

  it("splits the clock into dawn, day, dusk, and night", () => {
    expect(lakeHour(at(4))).toBe("night");
    expect(lakeHour(at(6))).toBe("dawn");
    expect(lakeHour(at(12))).toBe("day");
    expect(lakeHour(at(19))).toBe("dusk");
    expect(lakeHour(at(22))).toBe("night");
  });

  it("reads a forced hour from the query string", () => {
    expect(lakeHourFromSearch("?hour=night")).toBe("night");
    expect(lakeHourFromSearch("hour=dawn")).toBe("dawn");
    expect(lakeHourFromSearch("?hour=noon")).toBeNull();
  });

  it("favors night hunters after dark and trout at dawn", () => {
    const catfish = fishById("catfish")!;
    const bluegill = fishById("bluegill")!;
    const trout = fishById("brook-trout")!;
    expect(biteHourMul(catfish, "night")).toBeGreaterThan(biteHourMul(bluegill, "night"));
    expect(biteHourMul(trout, "dawn")).toBeGreaterThan(biteHourMul(trout, "day"));
    expect(lakeHourWaitMul("night")).toBeGreaterThan(lakeHourWaitMul("dawn"));
  });
});

describe("lodge board", () => {
  const ash: BoardStat = {
    userId: "a",
    displayName: "Ash",
    lifetimePoints: 50,
    heaviest: 2,
    species: 3,
    catches: 4,
  };
  const bo: BoardStat = {
    userId: "b",
    displayName: "Bo",
    lifetimePoints: 350,
    heaviest: 8,
    species: 6,
    catches: 12,
  };
  const cy: BoardStat = {
    userId: "c",
    displayName: "Cy",
    lifetimePoints: 50,
    heaviest: 4,
    species: 2,
    catches: 3,
  };

  it("ranks lifetime points first, then heaviest", () => {
    const ranked = rankBoard([ash, bo, cy]);
    expect(ranked.map((row) => row.userId)).toEqual(["b", "c", "a"]);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[0]?.level).toBe(4);
  });

  it("breaks leftover ties by display name", () => {
    const ranked = rankBoard([
      { ...ash, userId: "z", displayName: "Zed", heaviest: 4 },
      { ...cy, userId: "c", displayName: "Cy", heaviest: 4 },
    ]);
    expect(ranked.map((row) => row.userId)).toEqual(["c", "z"]);
  });

  it("keeps the top 100 and still returns you when you sit below it", () => {
    const crowd = Array.from({ length: 105 }, (_, i) => ({
      userId: `u${i}`,
      displayName: `Angler ${String(i).padStart(3, "0")}`,
      lifetimePoints: 105 - i,
      heaviest: 1,
      species: 1,
      catches: 1,
    }));
    const view = boardView(crowd, "u104");
    expect(view.entries).toHaveLength(BOARD_LIMIT);
    expect(view.entries.at(-1)?.userId).toBe("u99");
    expect(view.you?.rank).toBe(105);
    expect(view.you?.userId).toBe("u104");
  });

  it("returns a null standing when the viewer is not on the roster", () => {
    expect(boardView([ash], "missing").you).toBeNull();
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
