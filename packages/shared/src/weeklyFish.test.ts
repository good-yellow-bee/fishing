import { describe, expect, it } from "vitest";
import { weekStart } from "./board.ts";
import { fishById } from "./fish.ts";
import { catchPoints, validateCatch } from "./rules.ts";
import { weekFishFor, weekOf } from "./weeklyChallenges.ts";
import { SEASON_SPECIES } from "./season.ts";
import type { Profile } from "./types.ts";
import { seasonForWeek, WEEKLY_FISH_BONUS, weeklyBonus, weeklyFish, weeklyFishPool } from "./weeklyFish.ts";

const DAY = 86_400_000;

describe("fish of the week", () => {
  it("holds all week and turns over on Monday 00:00 UTC", () => {
    const monday = new Date("2026-10-12T00:00:00Z");
    const fish = weeklyFish(monday);
    for (let hour = 0; hour < 7 * 24; hour += 5) expect(weeklyFish(new Date(monday.getTime() + hour * 3_600_000)).id).toBe(fish.id);
    expect(weekStart(new Date(monday.getTime() - 1)).getTime()).toBe(monday.getTime() - 7 * DAY);
  });

  it("is always in its season's run and never legendary", () => {
    for (let week = 0; week < 104; week += 1) {
      const at = new Date(Date.UTC(2026, 0, 5) + week * 7 * DAY);
      const fish = weeklyFish(at);
      const season = seasonForWeek(weekStart(at));
      expect(fish.rarity).not.toBe("legendary");
      expect(SEASON_SPECIES[season][fish.id] ?? 1).toBeGreaterThan(1);
    }
  });

  it("varies over a season rather than naming the same fish every week", () => {
    const seen = new Set<string>();
    for (let week = 0; week < 12; week += 1) seen.add(weeklyFish(new Date(Date.UTC(2026, 5, 1) + week * 7 * DAY)).id);
    expect(seen.size).toBeGreaterThan(2);
    for (const season of ["spring", "summer", "fall", "winter"] as const) expect(weeklyFishPool(season).length).toBeGreaterThan(1);
  });

  it("pays the bonus only for the named fish", () => {
    const at = new Date("2026-10-14T12:00:00Z");
    const named = weeklyFish(at);
    expect(weeklyBonus(named.id, at)).toBe(WEEKLY_FISH_BONUS);
    expect(weeklyBonus("golden-shiner", at)).toBe(1);
  });

  it("scores the named fish with the bonus when the catch is recorded", () => {
    const at = new Date("2026-10-14T12:00:00Z");
    const named = weeklyFish(at);
    const angler: Profile = { userId: "u", displayName: "U", points: 0, lifetimePoints: 100_000, strength: 5, accuracy: 5, patience: 5 };
    const weight = (named.minWeight + named.maxWeight) / 2;
    const result = validateCatch(angler, { speciesId: named.id, weight, spot: named.spots[0]! }, at);
    expect(result).toMatchObject({ ok: true, points: catchPoints(fishById(named.id)!, weight, false, WEEKLY_FISH_BONUS) });
    expect(catchPoints(named, weight, false, WEEKLY_FISH_BONUS)).toBeGreaterThan(catchPoints(named, weight));
  });
});

describe("one week for the board and the bonus", () => {
  it("reads a local day by the angler's own Monday-to-Sunday week, the week the weekly challenges keep", () => {
    // A local Sunday whose evening is already Monday in UTC still names the Sunday's week.
    expect(weeklyFish("2026-10-25").id).toBe(weeklyFish(new Date(Date.UTC(2026, 9, 25, 12))).id);
    expect(weeklyFish("2026-10-25").id).toBe(weekFishFor(weekOf("2026-10-25")).id);
    expect(weeklyBonus(weeklyFish("2026-10-25").id, "2026-10-25")).toBe(WEEKLY_FISH_BONUS);
  });

  it("pays the catch's local week in validateCatch, not the server's UTC week", () => {
    const sunday = "2026-10-25";
    const fish = weeklyFish(sunday);
    const mondayUtc = new Date(Date.UTC(2026, 9, 26, 3));
    const local = validateCatch({ userId: "a", displayName: "A", points: 0, lifetimePoints: 1_000_000, strength: 8, accuracy: 8, patience: 8 }, { speciesId: fish.id, weight: fish.maxWeight, spot: fish.spots[0]!, clean: false, day: sunday }, mondayUtc);
    const utc = validateCatch({ userId: "a", displayName: "A", points: 0, lifetimePoints: 1_000_000, strength: 8, accuracy: 8, patience: 8 }, { speciesId: fish.id, weight: fish.maxWeight, spot: fish.spots[0]!, clean: false }, mondayUtc);
    expect(local.ok && utc.ok && local.points >= utc.points).toBe(true);
    if (weeklyFish(mondayUtc).id !== fish.id) expect(local.ok && utc.ok && local.points > utc.points).toBe(true);
  });
});
