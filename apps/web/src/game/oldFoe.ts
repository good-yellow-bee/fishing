import { FISH, type SpotId } from "@stillwater/shared";
import type { Recaught } from "./releasedFish";

/** Kept per angler, so another angler on the same browser meets no foe of theirs. */
export function oldFoeKey(userId: string) {
  return `stillwater.oldfoe.${userId}.v1`;
}
/** Days a trophy that broke off stays about its bank, there to meet again. */
export const FOE_DAYS = 3;
/** Chance a cast at its bank, on a later day, brings it up again. */
export const FOE_ODDS = 0.08;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The trophy that last broke off: its kind's id, weight, bank, when, the lure it carried off, and its report to the lodge. */
export type OldFoe = { species: string; weight: number; spot: SpotId; at: number; lure?: string; reportId?: string };

export function loadOldFoe(userId: string): OldFoe | null {
  try {
    const foe = JSON.parse(localStorage.getItem(oldFoeKey(userId)) ?? "null") as Partial<OldFoe> | null;
    return foe && typeof foe.species === "string" && typeof foe.weight === "number" && typeof foe.spot === "string" && typeof foe.at === "number"
      ? { species: foe.species, weight: foe.weight, spot: foe.spot, at: foe.at, ...(typeof foe.lure === "string" ? { lure: foe.lure } : {}), ...(typeof foe.reportId === "string" ? { reportId: foe.reportId } : {}) }
      : null;
  } catch {
    return null;
  }
}

export function saveOldFoe(userId: string, foe: OldFoe | null) {
  try {
    if (foe) localStorage.setItem(oldFoeKey(userId), JSON.stringify(foe));
    else localStorage.removeItem(oldFoeKey(userId));
  } catch {
    // A blocked store only means the foe is forgotten.
  }
}

/** Past its days the foe has moved off for good, and is forgotten. */
export function foeGone(foe: OldFoe, now: number): boolean {
  return now - foe.at > FOE_DAYS * DAY_MS;
}

/** Whether a fish is the stored foe itself. */
export function isOldFoe(foe: OldFoe | null, fish: { species: { id: string }; weight: number }): boolean {
  return !!foe && foe.species === fish.species.id && foe.weight === fish.weight;
}

/** Whether this cast brings the old foe up: at its bank, on a later day than it broke off, within its days, on a lucky cast. */
export function castForFoe(foe: OldFoe | null, spot: SpotId, now: number, roll: number): Recaught | null {
  if (!foe || foe.spot !== spot || new Date(foe.at).toDateString() === new Date(now).toDateString() || foeGone(foe, now) || roll >= FOE_ODDS) return null;
  const species = FISH.find((fish) => fish.id === foe.species);
  return species ? { species, weight: foe.weight, was: foe.weight, at: foe.at, foe: { ...(foe.lure ? { lure: foe.lure } : {}) } } : null;
}
