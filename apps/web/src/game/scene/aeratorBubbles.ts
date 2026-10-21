/** The aerator's bubbles (SC299), in the bait bucket's own frame: its water at `waterY`, the tube's end at (TUBE_X, TUBE_Z). Pure. */

export const AERATOR_BUBBLES = 5;
/** Seconds from a bubble breaking the water to the next one rising from the same slot. */
export const AERATOR_CYCLE_SEC = 1.1;
/** How high a bubble domes over the water before it pops, and its widest. */
export const AERATOR_RISE = 0.012;
export const AERATOR_BUBBLE_MAX = 0.007;
/** Where the tube dips into the water: on the bucket's back side, toward the camera behind the angler. */
export const TUBE_X = 0.02;
export const TUBE_Z = -0.05;
/** How far from the tube's end the bubbles break. */
const SPREAD = 0.025;
const GOLDEN = 0.618034;

export type AeratorBubble = { x: number; y: number; z: number; size: number };

function frac(value: number) {
  return value - Math.floor(value);
}

/** Bubble `index` at `time`: it swells and lifts over the water near the tube, then pops and a new one rises a little aside. */
export function aeratorBubble(index: number, time: number, waterY: number): AeratorBubble {
  const t = time / AERATOR_CYCLE_SEC + frac(index * GOLDEN);
  const round = Math.floor(t);
  const u = t - round;
  const angle = frac(round * GOLDEN + index * 0.37) * Math.PI * 2;
  const reach = SPREAD * Math.sqrt(frac((index + 0.5) / AERATOR_BUBBLES + round * GOLDEN));
  return {
    x: TUBE_X + Math.cos(angle) * reach,
    y: waterY + AERATOR_RISE * u,
    z: TUBE_Z + Math.sin(angle) * reach,
    size: AERATOR_BUBBLE_MAX * Math.sin(Math.PI * Math.min(1, u * 1.25)),
  };
}
