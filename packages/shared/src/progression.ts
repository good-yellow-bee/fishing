import type { SkillId, SpotId } from "./types.ts";

export const MAX_SKILL = 8;
export const DROPOFF_LEVEL = 3;
export const INLET_LEVEL = 6;
export const OPEN_LEVEL = 7;
export const SPOT_IDS: SpotId[] = ["dock", "reeds", "dropoff", "point", "inlet", "open"];

export const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3200, 5000, 8000];

export function anglerLevel(lifetimePoints: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (lifetimePoints >= LEVEL_THRESHOLDS[i]!) level = i + 1;
  }
  return level;
}

export type LevelProgress = {
  level: number;
  /** The next level, or null at the top. */
  next: number | null;
  /** Lifetime points still to earn for the next level; 0 at the top. */
  toNext: number;
  /** How far through the current level, 0 to 1 (1 at the top). */
  share: number;
};

/** Where an angler stands between their level and the next, for the HUD's level chip. */
export function levelProgress(lifetimePoints: number): LevelProgress {
  const level = anglerLevel(lifetimePoints);
  if (level >= LEVEL_THRESHOLDS.length) return { level, next: null, toNext: 0, share: 1 };
  const from = LEVEL_THRESHOLDS[level - 1]!;
  const to = LEVEL_THRESHOLDS[level]!;
  const points = Math.max(from, lifetimePoints);
  return { level, next: level + 1, toNext: to - points, share: (points - from) / (to - from) };
}

/** What the lake calls an angler at each level, from the first cast to the top of the board. */
export const ANGLER_TITLES = [
  "Greenhorn",
  "Dabbler",
  "Angler",
  "Keen angler",
  "Old hand",
  "Fish whisperer",
  "Lake master",
  "Lake legend",
  "Keeper of the lake",
  "Stillwater sage",
] as const;

export function anglerTitle(level: number): string {
  const i = Math.min(Math.max(Math.floor(level), 1), ANGLER_TITLES.length) - 1;
  return ANGLER_TITLES[i]!;
}

export function skillCost(currentRank: number): number {
  return 20 * currentRank * currentRank;
}

export function canUseSpot(spot: SpotId, level: number): boolean {
  if (spot === "dropoff") return level >= DROPOFF_LEVEL;
  if (spot === "inlet") return level >= INLET_LEVEL;
  if (spot === "open") return level >= OPEN_LEVEL;
  return true;
}

const LEVEL_UNLOCKS: Record<number, string> = {
  3: "The drop-off is open — walk east along the shore.",
  4: "See a fish shadow before you strike.",
  5: "Cast 25% farther.",
  6: "The inlet is open — follow the west shore north. Legendary fish bite more often at night or in rain.",
  7: "Fish bite 15% faster. The rowboat is yours — untie it at the dock and row out to open water.",
  8: "Better odds of trophy-size fish.",
  9: "Hooked fish tire 20% faster.",
  10: "Rare and legendary fish bite more often.",
};

export function levelUnlock(level: number): string | null {
  return LEVEL_UNLOCKS[level] ?? null;
}

export function canPreviewFish(level: number): boolean {
  return level >= 4;
}

export function castRangeMultiplier(level: number): number {
  return level >= 5 ? 1.25 : 1;
}

/** How much faster a hooked fish tires at this level. */
export function fishTireMulForLevel(level: number): number {
  return level >= 9 ? 1.2 : 1;
}

/** How much more often rare and legendary fish are drawn at this level, within what the angler can land. */
export function rareBiteMulForLevel(level: number): number {
  return level >= 10 ? 1.5 : 1;
}

export function biteWaitMulForLevel(level: number): number {
  return level >= 7 ? 0.85 : 1;
}

export function nextSkillRank(current: number): number | null {
  if (current >= MAX_SKILL) return null;
  return current + 1;
}

export const SKILL_LABELS: Record<SkillId, string> = {
  strength: "Strength",
  accuracy: "Accuracy",
  patience: "Patience",
};

export const SPOT_LABELS: Record<SpotId, string> = {
  dock: "Dock",
  reeds: "Reeds",
  dropoff: "Drop-off",
  point: "Point",
  inlet: "Inlet",
  open: "Open water",
};
