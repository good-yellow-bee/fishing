import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { CABIN_AT, CABIN_YAW } from "./cabinLook";

/**
 * Someone splitting firewood beside the far cabin on fall and winter days: they stand a log on
 * the chopping block, raise the axe overhead, bring it down so the two halves fall apart, then
 * gather the halves and toss them onto the stack behind them before setting up the next. Pure in time.
 */

/** Seconds for one log, from setting it on the block to tossing its halves on the stack. */
export const CHOP_SEC = 8;

/** Out by day in fall and winter, when the stove needs feeding, unless it is raining. */
export function choppingOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && (season === "fall" || season === "winter") && sky !== "rain";
}

/** A point beside the cabin, `across` metres along its front (positive is its right as you face it from the lake) and `out` metres in front of it. */
function besideCabin(across: number, out: number) {
  const cos = Math.cos(CABIN_YAW);
  const sin = Math.sin(CABIN_YAW);
  return { x: CABIN_AT.x - across * cos + out * sin, z: CABIN_AT.z + across * sin + out * cos };
}

/** The chopping block: off the cabin's east end, a little in front of it. */
export const BLOCK_AT = besideCabin(-2.9, 0.9);
/** How far behind the block the woodcutter stands, an axe's reach. */
export const REACH = 1.2;
/** Where the woodcutter stands, facing the lake across the block. */
export const CUTTER_AT = besideCabin(-2.9, 0.9 - REACH);
/** Which way they face at the block, toward the lake; the stack is a quarter turn to their right. */
export const CUTTER_YAW = CABIN_YAW;
/** The stack of split logs, along the cabin's end wall. */
export const STACK_AT = besideCabin(-1.95, -0.3);

export type ChopPose = {
  /** The arms' swing up from hanging by the sides: about 1 holds the axe head down on the block, 3 raises it overhead. */
  swing: number;
  /** How far they stoop, 0 upright to 1 bent to the block. */
  stoop: number;
  /** How far they have turned from the block toward the stack, in radians (negative is to their right). */
  turn: number;
  /** Whether a whole log stands on the block. */
  log: boolean;
  /** The two halves' fall from upright (0) to lying either side of the block (1), or null when they are not there. */
  split: number | null;
};

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

function between(t: number, from: number, to: number) {
  return smooth((t - from) / (to - from));
}

/** The woodcutter `time` seconds in. `still` holds them with the axe resting on a whole log. */
export function chopAt(time: number, still = false): ChopPose {
  if (still) return { swing: 1.1, stoop: 0, turn: 0, log: true, split: null };
  const t = ((time % CHOP_SEC) + CHOP_SEC) % CHOP_SEC;
  // Stooping to stand a new log on the block, and straightening up.
  if (t < 1.3) return { swing: 0.9 + 0.2 * between(t, 1, 1.3), stoop: 1 - between(t, 0.7, 1.3), turn: 0, log: t > 0.5, split: null };
  // Raising the axe slowly overhead.
  if (t < 2.5) return { swing: 1.1 + 1.9 * between(t, 1.3, 2.5), stoop: 0, turn: 0, log: true, split: null };
  // Bringing it down hard: slow off the top, fastest at the block.
  if (t < 2.7) {
    const k = (t - 2.5) / 0.2;
    return { swing: 3 - 2 * k * k, stoop: 0.25 * k, turn: 0, log: true, split: null };
  }
  // The halves fall apart either side, and the woodcutter catches their breath.
  if (t < 5) return { swing: 1, stoop: 0.25 * (1 - between(t, 3.2, 3.8)), turn: 0, log: false, split: between(t, 2.7, 3.2) };
  // Stooping to gather the halves, then turning to toss them on the stack and back to the block.
  if (t < 6) return { swing: 1 - 0.3 * between(t, 5, 5.6), stoop: between(t, 5, 5.6) - between(t, 5.6, 6), turn: 0, log: false, split: t < 5.6 ? 1 : null };
  return { swing: 0.7 + 0.5 * between(t, 6.2, 6.6) - 0.3 * between(t, 6.6, 7), stoop: 0, turn: -1.5 * (between(t, 6, 6.5) - between(t, 7, 7.6)), log: false, split: null };
}
