import type { CatchEntry } from "@stillwater/shared";
import { onPiece } from "../field/pieceTally";

export type LureTier = "proven" | "trusted" | "lucky";
/** Each tier's name, in English; shown through t(). */
export const LURE_TIER_WORD: Record<LureTier, string> = { proven: "Proven", trusted: "Trusted", lucky: "Lucky" };
/** A lure climbs a tier at each of these counts of fish taken on it in the field log. */
export const LURE_TIERS: readonly { tier: LureTier; at: number }[] = [
  { tier: "proven", at: 10 },
  { tier: "trusted", at: 30 },
  { tier: "lucky", at: 75 },
];

/** How many fish the field log took on this lure, however it was spelled. */
export function lureCatchCount(catches: readonly CatchEntry[], lure: string): number {
  return catches.filter((entry) => onPiece(entry, lure)).length;
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
