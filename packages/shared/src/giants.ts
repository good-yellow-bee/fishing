import { weekStart } from "./board.ts";
import { FISH } from "./fish.ts";
import { seeded } from "./hotBank.ts";
import type { SpotId } from "./types.ts";

/** Banks that hold a giant each week; the open water is a trip, not a bank, and has none. */
export const GIANT_BANKS: readonly SpotId[] = ["dock", "reeds", "point", "dropoff", "inlet"];
/** Landing a bank's giant first pays this many points on top. */
export const GIANT_BONUS = 200;
/** A giant its first angler let go back pays the next angler to land it this many. */
export const GIANT_AGAIN_BONUS = 100;
/** Chance a cast at a bank whose giant is still about brings it up. */
export const GIANT_ODDS = 0.012;
/** The names the lodge gives its giants, one per bank each week. */
export const GIANT_NAMES = ["Old Moss", "Iron Jaw", "Grandmother", "The Captain", "Tarnish", "Old Gold", "Scarback", "The Widow", "Ledger", "Kingpost"] as const;

export type Giant = { spot: SpotId; name: string; speciesId: string; weight: number };

/** The giants' week a moment falls in, as the server keys a landed giant: its Monday (UTC), YYYY-MM-DD. */
export function giantWeek(at: Date = new Date()): string {
  return weekStart(at).toISOString().slice(0, 10);
}

/** The week's giants (from Monday 00:00 UTC), one per bank: a big fish of a kind that lives there, never a legend, at the top of its kind's range. */
export function giantsForWeek(at: Date = new Date()): Giant[] {
  const week = Math.round(weekStart(at).getTime() / 604_800_000);
  const names = [...GIANT_NAMES];
  return GIANT_BANKS.flatMap((spot, index) => {
    const random = seeded(week * 97 + index * 13 + 7);
    const kinds = FISH.filter((fish) => fish.spots.includes(spot) && fish.rarity !== "legendary" && fish.rarity !== "common");
    if (kinds.length === 0) return [];
    const species = kinds[Math.floor(random() * kinds.length)]!;
    const name = names.splice(Math.floor(random() * names.length), 1)[0]!;
    return [{ spot, name, speciesId: species.id, weight: Math.round(species.maxWeight * (0.95 + random() * 0.05) * 100) / 100 }];
  });
}

/** The week's giant at a bank, if it holds one. */
export function giantAt(spot: SpotId, at: Date = new Date()): Giant | undefined {
  return giantsForWeek(at).find((giant) => giant.spot === spot);
}
