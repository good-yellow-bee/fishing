import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A paddleboarder: on calm, fine summer days someone stands on a paddleboard with a little dog
 * sitting up at its nose, paddling slowly across the west half of the lake and back. They take a
 * run of strokes on one side, then swap the paddle across to the other, and turn the board round
 * in place at each end. The dog looks about. Pure in time.
 */

/** By day in summer on fine, calm water. */
export function paddleOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season === "summer" && (sky === "clear" || sky === "partly-cloudy") && Math.hypot(wind.x, wind.z) < CALM;
}

/** Above this drift the water is too choppy to stand up on. */
export const CALM = 0.1;
/** The two ends of the run: in front of the far west bank, clear of the reeds, the canoe's shore course, the sailing dinghy's reach and the swans' loop. */
export const PADDLE_FROM = { x: -13, z: -4.5 };
export const PADDLE_TO = { x: -4.5, z: -6 };
/** Seconds to paddle the run one way, and to turn the board round at its end. */
export const LEG_SEC = 70;
export const TURN_SEC = 7;
const LOOP_SEC = 2 * (LEG_SEC + TURN_SEC);
/** Seconds for one stroke, and strokes taken on one side before swapping. */
export const STROKE_SEC = 1.7;
export const STROKES_A_SIDE = 6;
/** How much each stroke surges the board on: 0 a steady glide. */
const SURGE = 0.25;

export type PaddlePose = {
  x: number;
  z: number;
  /** Which way the nose points; the nose is the board's +z. */
  yaw: number;
  /** Where the stroke is, 0 to 1: the blade in the water to 0.55, then carried forward. */
  stroke: number;
  /** Which side the paddle is on, 1 the board's +x. */
  side: 1 | -1;
  /** How far the paddle has been carried across to the other side, 0 to 1 over the swap; 0 when not swapping. */
  swap: number;
};

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/** The board `time` seconds in. `still` holds it gliding mid-run, paddle in the water. */
export function paddleAt(time: number, still = false): PaddlePose {
  const t = still ? LEG_SEC / 2 : ((time % LOOP_SEC) + LOOP_SEC) % LOOP_SEC;
  const dx = PADDLE_TO.x - PADDLE_FROM.x;
  const dz = PADDLE_TO.z - PADDLE_FROM.z;
  const out = Math.atan2(dx, dz);
  const strokes = still ? 0.3 : time / STROKE_SEC;
  const run = Math.floor(strokes / STROKES_A_SIDE);
  const side: 1 | -1 = run % 2 === 0 ? 1 : -1;
  const inRun = strokes - run * STROKES_A_SIDE;
  // The last stroke of a run is spent lifting the paddle over to the other side.
  const swap = still ? 0 : Math.max(0, inRun - (STROKES_A_SIDE - 1));
  const stroke = still ? 0.3 : (((strokes % 1) + 1) % 1);
  const leg = (s: number) => {
    // Fastest mid-pull, easing as the blade is carried forward; no surge while swapping.
    const surged = s - (SURGE * STROKE_SEC * Math.sin(2 * Math.PI * (s / STROKE_SEC) - 0.5)) / (2 * Math.PI);
    return Math.min(1, Math.max(0, surged / LEG_SEC));
  };
  let u: number;
  let yaw: number;
  if (t < LEG_SEC) {
    u = leg(t);
    yaw = out;
  } else if (t < LEG_SEC + TURN_SEC) {
    u = 1;
    yaw = out + Math.PI * smooth((t - LEG_SEC) / TURN_SEC);
  } else if (t < 2 * LEG_SEC + TURN_SEC) {
    u = 1 - leg(t - LEG_SEC - TURN_SEC);
    yaw = out + Math.PI;
  } else {
    u = 0;
    yaw = out + Math.PI + Math.PI * smooth((t - 2 * LEG_SEC - TURN_SEC) / TURN_SEC);
  }
  return { x: PADDLE_FROM.x + dx * u, z: PADDLE_FROM.z + dz * u, yaw, stroke, side, swap };
}

/** How far forward the blade is along the board, 1 reached out at the catch to -0.4 back by the feet. */
export function bladeReach(stroke: number) {
  if (stroke < 0.55) return 1 - 1.4 * smooth(stroke / 0.55);
  return -0.4 + 1.4 * smooth((stroke - 0.55) / 0.45);
}

/** How deep the blade is, 1 buried through the pull, 0 carried clear. */
export function bladeDip(stroke: number) {
  if (stroke < 0.05) return stroke / 0.05;
  if (stroke < 0.5) return 1;
  if (stroke < 0.6) return 1 - (stroke - 0.5) / 0.1;
  return 0;
}

/** Where the dog is looking, radians off the nose: it holds a look a few seconds, then turns its head to another. */
export function dogLook(time: number, still = false) {
  if (still) return 0;
  const HOLD = 3.2;
  const n = Math.floor(time / HOLD);
  const pick = (i: number) => {
    const s = Math.sin(i * 91.7 + 13.1) * 43758.5453;
    return ((s - Math.floor(s)) * 2 - 1) * 0.9;
  };
  return pick(n) + (pick(n + 1) - pick(n)) * smooth((time - n * HOLD - (HOLD - 0.8)) / 0.8);
}
