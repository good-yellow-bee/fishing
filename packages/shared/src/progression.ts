import type { SkillId, SpotId } from "./types.ts";

export const MAX_SKILL = 8;
export const DROPOFF_LEVEL = 3;
export const SPOT_IDS: SpotId[] = ["dock", "reeds", "dropoff", "point"];

export const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3200];

export function anglerLevel(lifetimePoints: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (lifetimePoints >= LEVEL_THRESHOLDS[i]!) level = i + 1;
  }
  return level;
}

export function skillCost(currentRank: number): number {
  return 20 * currentRank * currentRank;
}

export function canUseSpot(spot: SpotId, level: number): boolean {
  return spot !== "dropoff" || level >= DROPOFF_LEVEL;
}

const LEVEL_UNLOCKS: Record<number, string> = {
  3: "The drop-off is open — walk east along the shore.",
  4: "See a fish shadow before you strike.",
  5: "Cast 25% farther.",
  6: "Legendary fish bite more often at night or in rain.",
  7: "Fish bite 15% faster.",
  8: "Better odds of trophy-size fish.",
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
};
