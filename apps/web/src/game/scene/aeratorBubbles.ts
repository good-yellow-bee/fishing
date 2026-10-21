import { frac, GOLDEN } from "./hotspotBubbles";

/** The aerator's bubbles (SC299), in the bait bucket's own frame: its water at `waterY`, the airstone under (STONE_X, STONE_Z). Pure. */

export const AERATOR_BUBBLES = 5;
/** Seconds from a bubble breaking the water to the next one rising from the same slot. */
export const AERATOR_CYCLE_SEC = 1.1;
/** How high a bubble domes over the water before it pops, and its widest. */
export const AERATOR_RISE = 0.018;
export const AERATOR_BUBBLE_MAX = 0.012;
/** The airstone on the bucket's floor: on its far side from the camera behind the angler, where the near rim doesn't hide the water. */
export const STONE_X = -0.045;
export const STONE_Z = 0.045;
/** How far from over the airstone the bubbles break. */
const SPREAD = 0.02;

export type AeratorBubble = { x: number; y: number; z: number; size: number };

/** Bubble `index` at `time`: it swells and lifts over the water above the airstone, then pops and a new one rises a little aside. */
export function aeratorBubble(index: number, time: number, waterY: number): AeratorBubble {
  const t = time / AERATOR_CYCLE_SEC + frac(index * GOLDEN);
  const round = Math.floor(t);
  const u = t - round;
  const angle = frac(round * GOLDEN + index * 0.37) * Math.PI * 2;
  const reach = SPREAD * Math.sqrt(frac((index + 0.5) / AERATOR_BUBBLES + round * GOLDEN));
  return {
    x: STONE_X + Math.cos(angle) * reach,
    y: waterY + AERATOR_RISE * u,
    z: STONE_Z + Math.sin(angle) * reach,
    size: AERATOR_BUBBLE_MAX * Math.sin(Math.PI * Math.min(1, u * 1.25)),
  };
}
