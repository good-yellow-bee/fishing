import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import { BOARD_LIMIT, boardView, lodgeStamp, rankBoard, weekStart, type BoardStat, type SpeciesRecord } from "./board.ts";
import { fieldGuide, guideProgress, catchStamp } from "./guide.ts";
import { biteHourMul, lakeHour, lakeHourFromSearch, lakeHourWaitMul } from "./hour.ts";
import {
  BOAT_CAST_RANGE,
  CAST_RANGE,
  DOCK_PAD,
  DOCK_PLANKS,
  DOCK_STAND_X,
  DOCK_STAND_Z,
  DROPOFF_PAD,
  INLET_PAD,
  LAKE_CENTER_Z,
  OPEN_PAD,
  OPEN_WATER,
  POINT_MAX_X,
  POINT_PAD,
  REEDS_MAX_X,
  REEDS_PAD,
  SHOP_X,
  SHOP_Z,
  SPAWN_X,
  SPAWN_Z,
  footHeight,
  inCastRange,
  inLake,
  onDockPlanks,
  parseAim,
  parseStance,
  resolveCast,
  resolveLanding,
  spotAt,
  stanceAt,
  walkableAt,
} from "./lake.ts";
import { anglerLevel, canUseSpot, INLET_LEVEL, skillCost, SPOT_IDS } from "./progression.ts";
import { canLand, catchPoints, legendaryCanBite, skillUnlock, validateCatch, validateUpgrade, weightInRange } from "./rules.ts";
import type { Profile } from "./types.ts";
import { weeklyFish } from "./weeklyFish.ts";

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

  it("awards a rounded 1.5x clean-fight bonus", () => {
    const perch = fishById("perch")!;
    const mid = (perch.minWeight + perch.maxWeight) / 2;
    expect(catchPoints(perch, mid, true)).toBe(Math.round(perch.basePoints * 1.5));
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

  it("applies the clean-fight bonus only to catches marked clean", () => {
    const perch = fishById("perch")!;
    const request = { speciesId: "perch", weight: 0.8, spot: "dock" as const };
    // A summer week, when perch can't be the fish of the week, so no weekly bonus muddies the sums.
    const at = new Date("2026-07-15T12:00:00Z");
    expect(weeklyFish(at).id).not.toBe("perch");
    expect(validateCatch(starter, request, at)).toMatchObject({ ok: true, points: catchPoints(perch, 0.8) });
    expect(validateCatch(starter, { ...request, clean: false }, at)).toMatchObject({ ok: true, points: catchPoints(perch, 0.8) });
    expect(validateCatch(starter, { ...request, clean: true }, at)).toMatchObject({ ok: true, points: catchPoints(perch, 0.8, true) });
    expect(catchPoints(perch, 0.8, true)).toBeGreaterThan(catchPoints(perch, 0.8));
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

  it("stocks a different mix at the point than the dock", () => {
    const idsAt = (spot: "dock" | "point") =>
      FISH.filter((fish) => fish.spots.includes(spot))
        .map((fish) => fish.id)
        .sort();
    const point = idsAt("point");
    const dock = idsAt("dock");
    expect(point).toEqual(["bluegill", "brook-trout", "largemouth-bass", "pike", "walleye"]);
    expect(dock).toEqual(["carp", "catfish", "crappie", "golden-shiner", "perch", "smallmouth-bass"]);
    expect(point.some((id) => dock.includes(id))).toBe(false);
    expect(validateCatch(starter, { speciesId: "bluegill", weight: 0.3, spot: "point" }).ok).toBe(true);
    expect(validateCatch(starter, { speciesId: "bluegill", weight: 0.3, spot: "dock" }).ok).toBe(false);
    expect(validateCatch(starter, { speciesId: "perch", weight: 0.8, spot: "point" }).ok).toBe(false);
    expect(validateCatch(starter, { speciesId: "perch", weight: 0.8, spot: "dock" }).ok).toBe(true);
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
    expect(spotAt(12, -6)).toBe("dropoff");
    expect(spotAt(4, -5)).toBe("open");
    expect(spotAt(0, 20)).toBe(null);
  });

  it("opens the basin's deep hole to the rowboat at level 7, and only from the boat", () => {
    expect(resolveLanding(OPEN_WATER.x, OPEN_WATER.z, 6)).toEqual({ ok: false, reason: "locked" });
    expect(resolveLanding(OPEN_WATER.x, OPEN_WATER.z, 7)).toEqual({ ok: true, spot: "open" });
    expect(stanceAt(OPEN_PAD.x, OPEN_PAD.z)).toBe("open");
    expect(walkableAt(OPEN_PAD.x, OPEN_PAD.z)).toBe(false);
    // Everything above the drop-off line stays dock water.
    for (let x = -2; x <= 10; x += 0.25) expect(spotAt(x, LAKE_CENTER_Z + 0.05)).not.toBe("open");
    // From a bank, open water is another bank's water.
    expect(resolveCast(2, -3, "dock", 8, DOCK_STAND_X, DOCK_STAND_Z)).toEqual({ ok: false, reason: "basin" });
    expect(resolveCast(6, -6, "open", 6, OPEN_PAD.x, OPEN_PAD.z)).toEqual({ ok: false, reason: "locked" });
    expect(resolveCast(6, -6, "open", 7, OPEN_PAD.x, OPEN_PAD.z)).toEqual({ ok: true, spot: "open" });
  });

  it("lets a cast from the boat fly 30% farther", () => {
    const far = CAST_RANGE * 1.25;
    expect(inCastRange(0, 0, far, 0, 1)).toBe(false);
    expect(inCastRange(0, 0, far, 0, 1, true)).toBe(true);
    expect(inCastRange(0, 0, CAST_RANGE * BOAT_CAST_RANGE + 0.01, 0, 1, true)).toBe(false);
  });

  it("parses the aim dataset", () => {
    expect(parseAim("4.0,-5.2")).toEqual({ x: 4, z: -5.2 });
    expect(parseAim("none")).toBe(null);
    expect(parseAim(undefined)).toBe(null);
  });

  it("locks drop-off landings before level 3", () => {
    expect(resolveLanding(12, -6, 1)).toEqual({ ok: false, reason: "locked" });
    expect(resolveLanding(12, -6, 3)).toEqual({ ok: true, spot: "dropoff" });
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

  it("stands the angler on the dock planks with dry feet", () => {
    expect(onDockPlanks(DOCK_STAND_X, DOCK_STAND_Z)).toBe(true);
    expect(walkableAt(DOCK_STAND_X, DOCK_STAND_Z)).toBe(true);
    expect(stanceAt(DOCK_STAND_X, DOCK_STAND_Z)).toBe("dock");
    expect(footHeight(DOCK_STAND_X, DOCK_STAND_Z)).toBe(DOCK_PLANKS.top);
    expect(DOCK_PLANKS.top).toBeCloseTo(0.27);
    expect(DOCK_PLANKS.top).toBeGreaterThan(0.2);
    expect(DOCK_PLANKS.top).toBeLessThan(0.5);
    expect(walkableAt(0.4, 7.2)).toBe(true);
    expect(walkableAt(-0.4, 6.2)).toBe(true);
    expect(inLake(1.6, 7)).toBe(true);
    expect(walkableAt(1.6, 7)).toBe(false);
    expect(walkableAt(-1.5, 6.8)).toBe(false);
    expect(walkableAt(0, 5.2)).toBe(false);
    expect(inLake(0.8, 9.2)).toBe(true);
    expect(walkableAt(0.8, 9.2)).toBe(false);
    expect(inLake(1.8, 10.4)).toBe(true);
    expect(walkableAt(1.8, 10.4)).toBe(false);
    expect(inLake(1.4, 11.2)).toBe(true);
    expect(walkableAt(1.4, 11.2)).toBe(false);
    expect(footHeight(1.6, 7)).toBe(0);
    expect(footHeight(SPAWN_X, SPAWN_Z)).toBe(0);
    for (const [x, z] of [
      [0, 6.8],
      [0, 8.1],
      [0, 9.4],
      [0.2, 10.3],
      [0.9, 10.4],
      [1.15, 11.4],
      [1.6, 11.5],
      [3.4, 13.2],
      [SPAWN_X, SPAWN_Z],
    ] as const) {
      expect(walkableAt(x, z)).toBe(true);
    }
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

  it("stands on the point and casts that shore", () => {
    expect(walkableAt(POINT_PAD.x, POINT_PAD.z)).toBe(true);
    expect(inLake(POINT_PAD.x, POINT_PAD.z)).toBe(false);
    expect(footHeight(POINT_PAD.x, POINT_PAD.z)).toBe(0);
    expect(stanceAt(POINT_PAD.x, POINT_PAD.z)).toBe("point");
    expect(stanceAt(5, 12)).toBe("trail");
    expect(spotAt(POINT_PAD.x, 6)).toBe("point");
    expect(spotAt(0.5, 3)).toBe("dock");
    expect(POINT_PAD.x - POINT_PAD.r).toBeGreaterThan(REEDS_MAX_X);
    expect(POINT_PAD.x + POINT_PAD.r).toBeLessThanOrEqual(POINT_MAX_X);
    const west = POINT_PAD.x - POINT_PAD.r + 0.05;
    const east = POINT_PAD.x + POINT_PAD.r - 0.05;
    expect(walkableAt(west, POINT_PAD.z)).toBe(true);
    expect(walkableAt(east, POINT_PAD.z)).toBe(true);
    expect(stanceAt(west, POINT_PAD.z)).toBe("point");
    expect(stanceAt(east, POINT_PAD.z)).toBe("point");
    expect(spotAt(west, 6)).toBe("point");
    expect(spotAt(east, 6)).toBe("point");
    expect(resolveCast(west, 6, "point", 1, west, POINT_PAD.z)).toEqual({ ok: true, spot: "point" });
    expect(resolveCast(east, 6, "point", 1, east, POINT_PAD.z)).toEqual({ ok: true, spot: "point" });
    expect(resolveCast(POINT_PAD.x, 6, "point", 1, POINT_PAD.x, POINT_PAD.z)).toEqual({ ok: true, spot: "point" });
    expect(resolveCast(POINT_MAX_X + 0.2, 6, "point", 1, POINT_PAD.x, POINT_PAD.z)).toEqual({ ok: false, reason: "basin" });
    expect(resolveCast(0, DOCK_STAND_Z, "point", 1, POINT_PAD.x, POINT_PAD.z)).toEqual({ ok: false, reason: "basin" });
    expect(resolveCast(4, -5, "point", 1, POINT_PAD.x, POINT_PAD.z)).toEqual({ ok: false, reason: "range" });
    expect(resolveCast(POINT_PAD.x, 6, "dock", 1, DOCK_PAD.x, DOCK_PAD.z)).toEqual({ ok: false, reason: "basin" });
    expect(parseStance("point")).toBe("point");
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
    expect(catchStamp([], "perch", 0.8)).toEqual({ kind: "first", trophy: false });
    expect(catchStamp([{ speciesId: "perch", caught: 2, heaviest: 0.9, lastAt: "x" }], "perch", 1.1)).toEqual({
      kind: "pb",
      previous: 0.9,
      trophy: true,
    });
    expect(catchStamp([{ speciesId: "perch", caught: 2, heaviest: 1.1, lastAt: "x" }], "perch", 0.8)).toEqual({
      kind: "repeat",
      heaviest: 1.1,
      trophy: false,
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
    score: 50,
    heaviest: 2,
    species: 3,
    catches: 4,
  };
  const bo: BoardStat = {
    userId: "b",
    displayName: "Bo",
    lifetimePoints: 350,
    score: 350,
    heaviest: 8,
    species: 6,
    catches: 12,
  };
  const cy: BoardStat = {
    userId: "c",
    displayName: "Cy",
    lifetimePoints: 50,
    score: 50,
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
      score: 105 - i,
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

  it("ranks the week on points landed since Monday, keeping the level from lifetime points", () => {
    const ranked = rankBoard([{ ...bo, score: 12 }, { ...ash, score: 40 }]);
    expect(ranked.map((row) => row.userId)).toEqual(["a", "b"]);
    expect(ranked[1]?.level).toBe(4);
    expect(boardView([ash], "a", BOARD_LIMIT, "week").period).toBe("week");
  });

  it("starts the week at Monday 00:00 UTC", () => {
    expect(weekStart(new Date("2026-10-11T23:59:00Z")).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(weekStart(new Date("2026-10-12T00:00:00Z")).toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(weekStart(new Date("2026-10-14T08:30:00Z")).toISOString()).toBe("2026-10-12T00:00:00.000Z");
  });
});

describe("lodge record stamp", () => {
  const records: SpeciesRecord[] = [{ speciesId: "pike", weight: 12.3, userId: "m", holder: "Mara", at: "2026-10-01T00:00:00Z" }];

  it("calls a species nobody has landed first on the wall", () => {
    expect(lodgeStamp(records, "carp", 3, "a")).toEqual({ kind: "first" });
  });

  it("names the old record and its holder when beaten, and stays quiet on a tie", () => {
    expect(lodgeStamp(records, "pike", 12.4, "a")).toEqual({ kind: "record", previous: 12.3, holder: "Mara", yours: false });
    expect(lodgeStamp(records, "pike", 12.4, "m")).toMatchObject({ yours: true });
    expect(lodgeStamp(records, "pike", 12.3, "a")).toBeNull();
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

  it("names the species the next useful rank lets this angler land", () => {
    expect(skillUnlock(starter, "strength")).toBe("Strength 2: Brook trout, Smallmouth bass, Rainbow trout, Largemouth bass");
    // Burbot also needs Accuracy 2, so Strength 3 alone does not open it.
    expect(skillUnlock({ ...starter, strength: 2 }, "strength")).toBe("Strength 3: Common carp, Channel catfish");
    expect(skillUnlock({ ...starter, strength: 2, accuracy: 2 }, "strength")).toBe(
      "Strength 3: Common carp, Channel catfish, Walleye, Burbot",
    );
    expect(skillUnlock({ ...starter, strength: 3 }, "accuracy")).toBe("Accuracy 2: Walleye, Burbot");
  });

  it("has no unlock line when no rank of that skill opens a fish on its own", () => {
    expect(skillUnlock(starter, "accuracy")).toBeNull();
    expect(skillUnlock({ ...starter, strength: 5 }, "strength")).toBeNull();
    expect(skillUnlock({ ...starter, strength: 8, accuracy: 8 }, "strength")).toBeNull();
    expect(skillUnlock(starter, "patience")).toBeNull();
  });
});

describe("inlet bank", () => {
  it("opens at level 6", () => {
    expect(canUseSpot("inlet", INLET_LEVEL - 1)).toBe(false);
    expect(canUseSpot("inlet", INLET_LEVEL)).toBe(true);
  });

  it("stands on the dry west shore and fishes the lake's north-west water", () => {
    expect(walkableAt(INLET_PAD.x, INLET_PAD.z)).toBe(true);
    expect(inLake(INLET_PAD.x, INLET_PAD.z)).toBe(false);
    expect(stanceAt(INLET_PAD.x, INLET_PAD.z)).toBe("inlet");
    expect(parseStance("inlet")).toBe("inlet");
    expect(spotAt(-18, -6)).toBe("inlet");
    // The reeds keep their water south of the line and east of it.
    expect(spotAt(-18, -2)).toBe("reeds");
    expect(spotAt(-12, -6)).toBe("reeds");
  });

  it("casts from the inlet once open, and the reeds stand cannot reach it", () => {
    expect(resolveCast(-18, -6, "inlet", INLET_LEVEL, INLET_PAD.x, INLET_PAD.z)).toEqual({ ok: true, spot: "inlet" });
    expect(resolveCast(-18, -6, "inlet", INLET_LEVEL - 1, INLET_PAD.x, INLET_PAD.z)).toEqual({ ok: false, reason: "locked" });
    const reeds = resolveCast(-16, -5, "reeds", 8, REEDS_PAD.x, REEDS_PAD.z);
    expect(reeds.ok).toBe(false);
  });

  it("keeps a common at the inlet and lands every inlet fish only there or on its other banks", () => {
    const inlet = FISH.filter((fish) => fish.spots.includes("inlet"));
    expect(inlet.some((fish) => fish.rarity === "common")).toBe(true);
    expect(inlet.map((fish) => fish.id).sort()).toEqual(["brook-trout", "ghost-pike", "golden-shiner", "rainbow-trout", "salmon", "walleye"]);
    expect(fishById("ghost-pike")?.spots).toEqual(["inlet"]);
  });
});

