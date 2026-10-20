import { weekStart } from "./board.ts";
import { FISH } from "./fish.ts";
import { lakeSeason, SEASON_SPECIES, type LakeSeason } from "./season.ts";
import type { FishSpecies } from "./types.ts";

/** Points multiplier for landing the fish of the week. */
export const WEEKLY_FISH_BONUS = 1.5;

/** The lodge's season for a board week, read in UTC so every angler and the server agree. */
export function seasonForWeek(start: Date): LakeSeason {
  // Thursday sits in the middle of the week, so a week that straddles a month counts with the month that holds most of it.
  const middle = new Date(start.getTime() + 3 * 86_400_000);
  return lakeSeason(new Date(2000, middle.getUTCMonth(), 15));
}

/** Fish the week can name: in their season's run and not legendary, so most anglers have a real shot. */
export function weeklyFishPool(season: LakeSeason): FishSpecies[] {
  const boosted = SEASON_SPECIES[season];
  return FISH.filter((fish) => fish.rarity !== "legendary" && (boosted[fish.id] ?? 1) > 1).sort((a, b) => a.id.localeCompare(b.id));
}

/** A steady pick per week: the same for everyone, no stored state. */
function weekIndex(start: Date): number {
  const weeks = Math.round(start.getTime() / (7 * 86_400_000));
  const s = Math.sin(weeks * 91.7 + 13.1) * 43758.5453;
  return Math.floor((s - Math.floor(s)) * 1_000_000);
}

/** The fish of the week holding `at`: a Date by its UTC week, or an angler's local day (YYYY-MM-DD) by their own
 * Monday-to-Sunday week, the week the catch bonus and the shack's weekly challenges both keep. */
export function weeklyFish(at: Date | string = new Date()): FishSpecies {
  const start = weekStart(typeof at === "string" ? new Date(`${at}T12:00:00.000Z`) : at);
  const pool = weeklyFishPool(seasonForWeek(start));
  return pool[weekIndex(start) % pool.length]!;
}

/** The bonus for a catch of `speciesId` landed at `at` (a Date, or the catch's local day): WEEKLY_FISH_BONUS for the fish of the week, else 1. */
export function weeklyBonus(speciesId: string, at: Date | string = new Date()): number {
  return weeklyFish(at).id === speciesId ? WEEKLY_FISH_BONUS : 1;
}
