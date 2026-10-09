import type { SpotId } from "@stillwater/shared";
import { favorsLargeFish, lureStrengthAt } from "./logic";
import type { ScenePhase } from "./scene/types";

/** Below this Strength most of what a big lure draws snaps the line. */
export const BIG_LURE_STRENGTH = 3;

/** Idle and the charge are still on the bank. Flight, fight, and landing keep the lure. */
export function lureCanChange(phase: ScenePhase): boolean {
  return phase === "idle" || phase === "casting";
}

/** The lure tied on until the angler picks one: the first small lure while the line is light. */
export function defaultLure(choices: readonly string[], strength: number): string {
  const first = choices[0] ?? "Bobber";
  if (strength >= BIG_LURE_STRENGTH) return first;
  return choices.find((lure) => !favorsLargeFish(lure)) ?? first;
}

export function smallLuresFirst(choices: readonly string[]): string[] {
  return [...choices.filter((lure) => !favorsLargeFish(lure)), ...choices.filter((lure) => favorsLargeFish(lure))];
}

export function lureBlurb(lure: string, spot: SpotId): string {
  if (favorsLargeFish(lure)) return `Big lure — heavier fish (Strength ${BIG_LURE_STRENGTH}+ to land most)`;
  // The light half of every bank still holds fish a Strength 1 line cannot land.
  return `Small lure — lighter fish (some here need Strength ${lureStrengthAt(spot, lure)})`;
}
