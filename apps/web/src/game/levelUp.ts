import { DROPOFF_LEVEL } from "@stillwater/shared";

export type LevelUp = { level: number; opened: string | null };

/** A rise past the level last seen, with what it opened; null on the first reading or when the level holds. */
export function levelUp(seen: number | null, level: number): LevelUp | null {
  if (seen === null || level <= seen) return null;
  const dropoff = seen < DROPOFF_LEVEL && level >= DROPOFF_LEVEL;
  return { level, opened: dropoff ? "The drop-off is open — walk east along the shore." : null };
}

/** A newer rise replaces the pending toast but keeps an unlock it had not shown yet. */
export function mergeLevelUp(pending: LevelUp | null, rise: LevelUp): LevelUp {
  return { level: rise.level, opened: rise.opened ?? pending?.opened ?? null };
}
