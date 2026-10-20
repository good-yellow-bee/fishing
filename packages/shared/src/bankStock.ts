import type { FishSpecies } from "./types.ts";

/** A bank's stock is read over this many days back. */
export const BANK_STOCK_DAYS = 7;
/** An angler who landed this many fish at a bank in that time has fished it down. */
export const BANK_DOWN_FISH = 30;
/** On a fished-down bank a fish keeps only this share of its weight above its kind's least. */
export const DOWN_WEIGHT = 0.6;

/** Whether a bank this many fish came from in the week is fished down. */
export function fishedDown(count: number): boolean {
  return count >= BANK_DOWN_FISH;
}

/** A fish's weight as a fished-down bank gives it: nearer its kind's least, to the hundredth of a pound. */
export function downWeight(species: FishSpecies, weight: number): number {
  return Math.round((species.minWeight + (weight - species.minWeight) * DOWN_WEIGHT) * 100) / 100;
}
