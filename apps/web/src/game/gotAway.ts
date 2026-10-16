import type { FishSpecies, SpotId } from "@stillwater/shared";

/** Chance a cast back at the bank brings the lost fish up again. */
export const AGAIN_ODDS = 0.3;
/** Casts, anywhere, before the lost fish moves off for good. */
export const AGAIN_CASTS = 5;

export type GotAway = { spot: SpotId; species: FishSpecies; weight: number; casts: number };

/** The fish that broke off, waiting to bite again at its bank; small common fish are never remembered. */
export function gotAwayAfterLoss(species: FishSpecies, weight: number, spot: SpotId): GotAway | null {
  return species.rarity === "common" ? null : { spot, species, weight, casts: AGAIN_CASTS };
}

/** Whether this cast brings the fish that got away back, and what is still waiting after it. */
export function castForGotAway(lost: GotAway | null, spot: SpotId, roll: number): { again: GotAway | null; next: GotAway | null } {
  if (!lost) return { again: null, next: null };
  if (lost.spot === spot && roll < AGAIN_ODDS) return { again: lost, next: null };
  return { again: null, next: lost.casts > 1 ? { ...lost, casts: lost.casts - 1 } : null };
}
