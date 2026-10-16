import type { SpotId } from "@stillwater/shared";
import { waterDepth } from "./scene/water";

/** Share of casts into the reed shallows that snag on the weed. */
export const SNAG_ODDS = 0.3;
/** Taps it takes to work a snagged lure free. */
export const SNAG_TAPS = 3;
/** Milliseconds after the lure settles that it fouls on the weed. */
export const SNAG_AT_MS = 900;
/** The weed grows where the reeds' water is this shallow or less (0 at the bank, 1 offshore). */
export const WEED_DEPTH = 0.45;

/** Whether a cast landing at (x, z) on `spot` lands in the reed bed's weed. */
export function inWeeds(spot: SpotId, x: number, z: number) {
  return spot === "reeds" && waterDepth(x, z) <= WEED_DEPTH;
}

/** Share of casts into the point's rocky shallows that snag on a rock. */
export const ROCK_SNAG_ODDS = 0.2;
/** The rocks lie where the point's water is this shallow or less. */
export const ROCK_DEPTH = 0.3;

export type SnagCover = "weed" | "rocks";

/** Whether a cast landing at (x, z) on `spot` lands among the point's shallow rocks. */
export function onRocks(spot: SpotId, x: number, z: number) {
  return spot === "point" && waterDepth(x, z) <= ROCK_DEPTH;
}

/** What this cast snags on, if anything: the reeds' weed or the point's rocks, never on a new angler's easy first fish. */
export function castSnags(spot: SpotId, x: number, z: number, mercy: boolean, roll: number): SnagCover | null {
  if (mercy) return null;
  if (inWeeds(spot, x, z) && roll < SNAG_ODDS) return "weed";
  if (onRocks(spot, x, z) && roll < ROCK_SNAG_ODDS) return "rocks";
  return null;
}
