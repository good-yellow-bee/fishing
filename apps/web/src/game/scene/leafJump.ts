import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A child jumping into a pile of raked leaves on the far bank on a dry fall day: a run-up, a leap,
 * a burst of leaves as they land, a moment lying buried in the pile, then back to the start to do
 * it again. Pure in time.
 */

/** Where the pile lies, round the shore rings (the shape's +y is the world's -z) and back from the waterline, behind the dog walker's path. */
const PILE_ANGLE = 1.2;
const PILE_OUT = 2.5;
/** How far along the bank the run-up starts, in metres from the pile. */
const RUN_UP = 3;
/** The round: running up, in the air, buried in the pile, climbing out, walking back, and waiting to go again. */
const RUN_SEC = 1.6;
const AIR_SEC = 0.6;
const LIE_SEC = 2.2;
const RISE_SEC = 0.8;
const BACK_SEC = 4;
const WAIT_SEC = 1.2;
export const JUMP_ROUND_SEC = RUN_SEC + AIR_SEC + LIE_SEC + RISE_SEC + BACK_SEC + WAIT_SEC;
/** Leaves thrown up by each landing, how high the burst goes, and how long they take to settle. */
export const BURST_LEAVES = 18;
const BURST_UP = 1.4;
const SETTLE_SEC = 2.6;
const BURST_SPREAD = 1.1;

/** Out by day in the fall, when it is dry. */
export function leafJumpOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "fall" && sky !== "rain";
}

function ring(angle: number, out: number) {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** The pile's middle. */
export const PILE_AT = ring(PILE_ANGLE, PILE_OUT);
/** Where the run-up starts: along the bank to the west of the pile. */
export const START_AT = (() => {
  const step = ring(PILE_ANGLE + 0.01, PILE_OUT);
  const length = Math.hypot(step.x - PILE_AT.x, step.z - PILE_AT.z);
  return { x: PILE_AT.x + ((step.x - PILE_AT.x) / length) * RUN_UP, z: PILE_AT.z + ((step.z - PILE_AT.z) / length) * RUN_UP };
})();
/** Which way the run-up faces, toward the pile. */
const TOWARD = Math.atan2(PILE_AT.x - START_AT.x, PILE_AT.z - START_AT.z);

export type JumperPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** How the child holds themself: 0 upright, 1 lying flat on their back in the pile. */
  lie: number;
  /** Where the legs are through a stride, -1 to 1, and how hard they are moving, 0 still to 1 running. */
  stride: number;
  pace: number;
  /** The arms flung up, 0 down to 1 overhead, as they leap. */
  arms: number;
};

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

/** The child `time` seconds in. `still` holds them standing at the start of the run-up. */
export function jumperAt(time: number, still = false): JumperPose {
  const t = still ? JUMP_ROUND_SEC - WAIT_SEC / 2 : ((time % JUMP_ROUND_SEC) + JUMP_ROUND_SEC) % JUMP_ROUND_SEC;
  const at = (k: number, y = 0) => ({ x: START_AT.x + (PILE_AT.x - START_AT.x) * k, y, z: START_AT.z + (PILE_AT.z - START_AT.z) * k });
  const leap = 0.62;
  let end = RUN_SEC;
  if (t < end) {
    const k = t / RUN_SEC;
    // Speeding up into the leap.
    return { ...at(leap * k * k), yaw: TOWARD, lie: 0, stride: Math.sin(t * 14), pace: 1, arms: 0 };
  }
  if (t < (end += AIR_SEC)) {
    const k = (t - RUN_SEC) / AIR_SEC;
    return { ...at(leap + (1 - leap) * k, 0.7 * Math.sin(Math.PI * k)), yaw: TOWARD, lie: smooth(k * 1.2) * 0.9, stride: 0, pace: 0, arms: 1 };
  }
  if (t < (end += LIE_SEC)) return { ...at(1, 0.1), yaw: TOWARD, lie: 1, stride: 0, pace: 0, arms: 0.4 + 0.3 * Math.sin((t - end) * 3) };
  if (t < (end += RISE_SEC)) {
    const k = smooth((t - end + RISE_SEC) / RISE_SEC);
    return { ...at(1, 0.1 * (1 - k)), yaw: TOWARD + Math.PI * k, lie: 1 - k, stride: 0, pace: 0, arms: 0 };
  }
  if (t < (end += BACK_SEC)) {
    const k = (t - end + BACK_SEC) / BACK_SEC;
    return { ...at(1 - smooth(k)), yaw: TOWARD + Math.PI, lie: 0, stride: Math.sin(t * 7), pace: 0.5, arms: 0 };
  }
  return { ...at(0), yaw: TOWARD, lie: 0, stride: 0, pace: 0, arms: 0 };
}

export type BurstLeaf = { x: number; y: number; z: number; spin: number };

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Leaf `i` of the burst `time` seconds in, or null while it lies in the pile: thrown up as the child lands, fluttering back down round the pile. */
export function burstLeaf(i: number, time: number, still = false): BurstLeaf | null {
  if (still) return null;
  const t = ((time % JUMP_ROUND_SEC) + JUMP_ROUND_SEC) % JUMP_ROUND_SEC;
  const since = t - RUN_SEC - AIR_SEC;
  const life = SETTLE_SEC * (0.7 + 0.3 * unit(i * 5 + 1));
  if (since < 0 || since > life) return null;
  const k = since / life;
  const angle = unit(i * 5 + 2) * Math.PI * 2;
  const reach = BURST_SPREAD * (0.3 + 0.7 * unit(i * 5 + 3));
  const up = BURST_UP * (0.5 + 0.5 * unit(i * 5 + 4));
  // Up fast, then fluttering down slowly, drifting out from the pile and swaying as it falls.
  const rise = Math.min(1, k * 4);
  const fall = Math.max(0, (k - 0.25) / 0.75);
  const sway = Math.sin(since * 6 + i) * 0.12 * fall;
  return {
    x: PILE_AT.x + Math.cos(angle) * (reach * Math.sqrt(k) + sway),
    y: 0.2 + up * (Math.sin((rise * Math.PI) / 2) - fall * fall),
    z: PILE_AT.z + Math.sin(angle) * (reach * Math.sqrt(k)) + sway,
    spin: since * (3 + unit(i * 5 + 5) * 4),
  };
}
