import { weekStart } from "./board.ts";
import { FISH } from "./fish.ts";
import type { SpotId } from "./types.ts";

/** Banks that hold a giant each week; the open water is a trip, not a bank, and has none. */
export const GIANT_BANKS: readonly SpotId[] = ["dock", "reeds", "point", "dropoff", "inlet"];
/** Landing a bank's giant first pays this many points on top. */
export const GIANT_BONUS = 200;
/** Chance a cast at a bank whose giant is still about brings it up. */
export const GIANT_ODDS = 0.012;
/** The names the lodge gives its giants, one per bank each week. */
export const GIANT_NAMES = ["Old Moss", "Iron Jaw", "Grandmother", "The Captain", "Tarnish", "Old Gold", "Scarback", "The Widow", "Ledger", "Kingpost"] as const;

export type Giant = { spot: SpotId; name: string; speciesId: string; weight: number };

/** mulberry32: the same week and bank always give the same giant. */
function seeded(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The week's giants (from Monday 00:00 UTC), one per bank: a big fish of a kind that lives there, never a legend, at the top of its kind's range. */
export function giantsForWeek(at: Date = new Date()): Giant[] {
  const week = Math.round(weekStart(at).getTime() / 604_800_000);
  const names = [...GIANT_NAMES];
  return GIANT_BANKS.map((spot, index) => {
    const random = seeded(week * 97 + index * 13 + 7);
    const kinds = FISH.filter((fish) => fish.spots.includes(spot) && fish.rarity !== "legendary" && fish.rarity !== "common");
    const species = kinds[Math.floor(random() * kinds.length)]!;
    const name = names.splice(Math.floor(random() * names.length), 1)[0]!;
    return { spot, name, speciesId: species.id, weight: Math.round(species.maxWeight * (0.95 + random() * 0.05) * 100) / 100 };
  });
}

/** The week's giant at a bank, if it holds one. */
export function giantAt(spot: SpotId, at: Date = new Date()): Giant | undefined {
  return giantsForWeek(at).find((giant) => giant.spot === spot);
}
