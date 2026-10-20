import { isTrophyWeight } from "./guide.ts";
import { isTaggable } from "./lodgeTags.ts";
import type { FishSpecies, SpotId } from "./types.ts";

/** Landing a trophy another angler lost pays its finder this many points on top. */
export const LOST_FINDER_BONUS = 30;
/** Chance a cast at a bank brings up a trophy another angler lost there. */
export const LODGE_LOST_ODDS = 0.05;
/** Days a lost trophy stays about its bank for the rest of the lodge. */
export const LOST_DAYS = 7;

/** A trophy another angler lost: its report, kind, weight, bank, the lure it carried off, when, and who lost it. */
export type LodgeLost = { id: string; speciesId: string; weight: number; spot: SpotId; lure: string | null; at: string; by: string };
/** One of the angler's own lost trophies that someone else has since landed. */
export type LostFound = { speciesId: string; weight: number; spot: SpotId };

/** Only a trophy the lodge would remember is reported lost: no small common fish, no legend. */
export function reportsLost(species: FishSpecies | undefined, weight: number): species is FishSpecies {
  return isTaggable(species) && isTrophyWeight(species, weight);
}

/** Lost trophies come back from LOST_DAYS ago. */
export function lostSince(at = new Date()): string {
  return new Date(at.getTime() - LOST_DAYS * 86_400_000).toISOString();
}
