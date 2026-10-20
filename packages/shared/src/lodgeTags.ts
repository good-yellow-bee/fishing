import { bagDay } from "./dayBag.ts";
import { FISH } from "./fish.ts";
import type { FishSpecies, SpotId } from "./types.ts";

/** Landing a fish another angler let go pays its finder this many points on top, and the angler who let it go this many. */
export const TAG_FINDER_BONUS = 30;
export const TAG_RETURN_BONUS = 20;
/** Chance a cast at a bank brings up a fish another angler let go there on an earlier day. */
export const LODGE_RECAPTURE_ODDS = 0.04;
/** The most a let-go fish grows back in the lake, however long it was gone. */
export const RELEASED_GROWTH_CAP = 0.3;
/** How far back the lake remembers other anglers' let-go fish. */
export const TAG_WINDOW_DAYS = 30;

/** A fish another angler let go: its catch, kind, weight then, bank, when it was landed, and who let it go. */
export type LodgeRelease = { catchId: string; speciesId: string; weight: number; spot: SpotId; at: string; by: string };

/** Small common fish go back unremembered, as with an angler's own let-go fish, and a legend keeps to its own rules of when it bites. */
export function isTaggable(species: FishSpecies | undefined): species is FishSpecies {
  return species !== undefined && species.rarity !== "common" && species.rarity !== "legendary";
}

/** The kinds a let-go fish of which the lake remembers. */
export const TAGGABLE_IDS: readonly string[] = FISH.filter(isTaggable).map((fish) => fish.id);

/** Other anglers' let-go fish come back from TAG_WINDOW_DAYS ago up to the start of today (UTC). */
export function tagWindow(at = new Date()): [string, string] {
  const today = bagDay(at).from;
  return [new Date(new Date(today).getTime() - TAG_WINDOW_DAYS * 86_400_000).toISOString(), today];
}

/** Whether a tagged fish's weight now fits the one let go: no lighter, and grown no more than the cap or past its kind's top. */
export function taggedWeightFits(species: FishSpecies, was: number, weight: number): boolean {
  return weight >= was && weight <= Math.min(species.maxWeight, was * (1 + RELEASED_GROWTH_CAP)) + 0.01;
}
