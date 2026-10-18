/**
 * Now and then a paddling duck up-ends to feed: it tips forward until its tail points at the sky,
 * holds there while it grazes the bottom, and bobs back up. Pure in time, like the rest of its loop.
 */

/** Seconds between one dip and the next for a duck, give or take its own offset. */
export const DABBLE_EVERY_SEC = 26;
/** Seconds from the start of the tip to back on an even keel. */
export const DABBLE_SEC = 4;
/** How far it tips at the bottom of the dip, radians: past straight down, tail up. */
export const DABBLE_TIP = 1.9;
const TIP_IN = 0.35;
const TIP_OUT = 0.6;

function seeded(n: number, salt: number) {
  const s = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * How far up-ended a duck is at `time`, 0 (afloat) to 1 (tail up): a quick tip, a hold while it
 * feeds with a little wiggle, and an easier rise. `phase` keeps each duck to its own beat, and some
 * rounds it skips, so the dips don't come like clockwork. `still` keeps it afloat for reduced motion.
 */
export function dabble(time: number, phase: number, still = false) {
  if (still) return 0;
  const shifted = time + phase * DABBLE_EVERY_SEC;
  const round = Math.floor(shifted / DABBLE_EVERY_SEC);
  if (seeded(round, phase) < 0.3) return 0;
  const start = seeded(round, phase + 1) * (DABBLE_EVERY_SEC - DABBLE_SEC);
  const k = shifted - round * DABBLE_EVERY_SEC - start;
  if (k <= 0 || k >= DABBLE_SEC) return 0;
  if (k < TIP_IN) return smooth(k / TIP_IN);
  if (k > DABBLE_SEC - TIP_OUT) return smooth((DABBLE_SEC - k) / TIP_OUT);
  return 1 - 0.06 * (1 - Math.cos((k - TIP_IN) * 9));
}

function smooth(x: number) {
  return x * x * (3 - 2 * x);
}
