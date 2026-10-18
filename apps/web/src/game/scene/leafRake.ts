import { PILE_AT, START_AT } from "./leafJump";

/**
 * A grown-up raking the leaves back onto the pile the child keeps jumping into, on the far side
 * of it from the run-up. They rake a few strokes from one spot, then shift round the pile to rake
 * from the next. Pure in time.
 */

/** How far from the pile's middle they stand, and the spots round it they rake from, as turns off the far side: round behind the pile, back from the water and out from under the big tree. */
const RAKE_REACH = 1.4;
const SPOTS = [-1.5, -1.85, -2.2, -1.85] as const;
/** One stroke, how many from each spot, and the walk to the next. */
export const STROKE_SEC = 2.1;
const STROKES = 4;
const SHIFT_SEC = 1.4;
const STAY_SEC = STROKE_SEC * STROKES;
export const RAKE_ROUND_SEC = (STAY_SEC + SHIFT_SEC) * SPOTS.length;
/** The share of a stroke spent pushing the rake out; the rest is the slow pull back. */
const PUSH = 0.3;

/** The far side of the pile from the run-up, as a direction. */
const AWAY = (() => {
  const dx = PILE_AT.x - START_AT.x;
  const dz = PILE_AT.z - START_AT.z;
  const length = Math.hypot(dx, dz);
  return { x: dx / length, z: dz / length };
})();

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function spotAt(turn: number) {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return { x: PILE_AT.x + (AWAY.x * cos - AWAY.z * sin) * RAKE_REACH, z: PILE_AT.z + (AWAY.x * sin + AWAY.z * cos) * RAKE_REACH };
}

export type RakerPose = {
  x: number;
  z: number;
  /** Facing the pile. */
  yaw: number;
  /** How far the rake is pushed out, 0 drawn in to 1 at full reach. */
  stroke: number;
  /** Where the legs are through a step, -1 to 1, and how much they are walking, 0 to 1. */
  stride: number;
  pace: number;
};

/** The raker `time` seconds in. `still` holds them at the first spot, rake drawn in. */
export function rakerAt(time: number, still = false): RakerPose {
  const t = still ? 0 : ((time % RAKE_ROUND_SEC) + RAKE_ROUND_SEC) % RAKE_ROUND_SEC;
  const leg = Math.floor(t / (STAY_SEC + SHIFT_SEC));
  const u = t - leg * (STAY_SEC + SHIFT_SEC);
  const from = SPOTS[leg]!;
  const to = SPOTS[(leg + 1) % SPOTS.length]!;
  const moving = u > STAY_SEC;
  const s = moving ? smooth((u - STAY_SEC) / SHIFT_SEC) : 0;
  const spot = spotAt(from + (to - from) * s);
  const phase = (u % STROKE_SEC) / STROKE_SEC;
  // Push out briskly, pull back slowly; no strokes while shifting round.
  const stroke = moving || still ? 0 : phase < PUSH ? smooth(phase / PUSH) : 1 - smooth((phase - PUSH) / (1 - PUSH));
  const pace = moving ? Math.sin(((u - STAY_SEC) / SHIFT_SEC) * Math.PI) : 0;
  return {
    ...spot,
    yaw: Math.atan2(PILE_AT.x - spot.x, PILE_AT.z - spot.z),
    stroke,
    stride: Math.sin((u - STAY_SEC) * 7),
    pace,
  };
}
