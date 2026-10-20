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
  const profile = { userId: "a", displayName: "A", points: 0, lifetimePoints: 1_000_000, strength: 8, accuracy: 8, patience: 8 };
  // A pair of weeks with different fish, so a Sunday evening that is Monday in UTC tells them apart.
  const sunday = ["2026-10-25", "2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22"].find((day) => {
    const next = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8)) + 1, 3));
    return weeklyFish(day).id !== weeklyFish(next).id;
  })!;
  const mondayUtc = new Date(Date.UTC(Number(sunday.slice(0, 4)), Number(sunday.slice(5, 7)) - 1, Number(sunday.slice(8)) + 1, 3));

  it("names the local Sunday's fish, the same as the weekly challenges, though UTC has turned to Monday", () => {
    expect(weeklyFish(sunday).id).not.toBe(weeklyFish(mondayUtc).id);
    expect(weeklyFish(sunday).id).toBe(weekFishFor(weekOf(sunday)).id);
  });

  it("pays the catch's local week within a day of the server's, and the server's own week for a day further off", () => {
    const fish = weeklyFish(sunday);
    const catchOn = (day?: string, at = mondayUtc) => validateCatch(profile, { speciesId: fish.id, weight: fish.maxWeight, spot: fish.spots[0]!, clean: false, day }, at);
    const local = catchOn(sunday);
    const utc = catchOn(undefined);
    const stale = catchOn(sunday, new Date(mondayUtc.getTime() + 14 * 86_400_000));
    expect(local.ok && utc.ok && local.points > utc.points).toBe(true);
    expect(stale.ok && local.ok && stale.points < local.points).toBe(true);
  });
});
