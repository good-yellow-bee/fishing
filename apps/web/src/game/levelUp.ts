import { levelUnlock } from "@stillwater/shared";

export type LevelUp = { level: number; opened: string | null };

/** A rise past the level last seen, with what it opened; null on the first reading or when the level holds. */
export function levelUp(seen: number | null, level: number): LevelUp | null {
  if (seen === null || level <= seen) return null;
  const opened = Array.from({ length: level - seen }, (_, i) => levelUnlock(seen + i + 1)).filter(Boolean);
  return { level, opened: opened.length > 0 ? opened.join(" ") : null };
}

/** A newer rise replaces the pending toast but keeps an unlock it had not shown yet. */
export function mergeLevelUp(pending: LevelUp | null, rise: LevelUp): LevelUp {
  return { level: rise.level, opened: [pending?.opened, rise.opened].filter(Boolean).join(" ") || null };
}
