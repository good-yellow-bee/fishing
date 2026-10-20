import { PLAY_LAKE_ID, type CatchEntry } from "@stillwater/shared";
import { pieceKey } from "../field/gear/pieceKey";

export type LureTier = "proven" | "trusted" | "lucky";
/** Each tier's name, in English; shown through t(). */
export const LURE_TIER_WORD: Record<LureTier, string> = { proven: "Proven", trusted: "Trusted", lucky: "Lucky" };
/** A lure climbs a tier at each of these counts of fish taken on it in the field log. */
export const LURE_TIERS: readonly { tier: LureTier; at: number }[] = [
  { tier: "proven", at: 10 },
  { tier: "trusted", at: 30 },
  { tier: "lucky", at: 75 },
];

/** How many fish the game landed on this lure, as the field log keeps them on the game's lake, however its plural was spelled; the reader's language plays no part. */
export function lureCatchCount(catches: readonly CatchEntry[], lure: string): number {
  const key = pieceKey(lure);
  return catches.filter((entry) => entry.spotId === PLAY_LAKE_ID && pieceKey(entry.lure) === key).length;
}

/** A lure's tier for the fish taken on it, or null under the first. */
export function lureTier(count: number): LureTier | null {
  return [...LURE_TIERS].reverse().find((step) => count >= step.at)?.tier ?? null;
}

/** The tier a lure reaches with its next fish, if that fish takes it up one. */
export function lureTierReachedBy(priorCount: number): LureTier | null {
  const next = lureTier(priorCount + 1);
  return next !== lureTier(priorCount) ? next : null;
}
