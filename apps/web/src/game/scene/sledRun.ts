import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Sledging: on winter days two children take turns sledging down the hill behind the far bank.
 * Each sits on a red sled at the top of a packed run, pushes off, rushes down in a spray of snow,
 * coasts to a stop at the foot, gets up and trudges back up beside the run pulling the sled, while
 * the other has their turn. Pure in time.
 */

/** By day in winter, unless it is raining or foggy. */
export function sleddersOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "winter" && sky !== "rain" && sky !== "fog";
}

/** The run, across the hill's face between the far trees: its top and its foot, by x and height. */
export const RUN_TOP = { x: 2.2, y: 4.4 };
export const RUN_FOOT = { x: 8.2, y: 1.3 };
/** The way back up keeps this far uphill of the run. */
const CLIMB_ABOVE = 0.55;
/** Seconds to rush down, coast to a stop, get up, trudge back up and get settled at the top. */
export const SLIDE_SEC = 4.5;
const COAST_SEC = 2.5;
const RISE_SEC = 1.5;
export const CLIMB_SEC = 26;
const SETTLE_SEC = 2.5;
export const LOOP_SEC = SLIDE_SEC + COAST_SEC + RISE_SEC + CLIMB_SEC + SETTLE_SEC;
/** How far along the run the sled has got when it starts to coast, of the whole run: where its speed carries smoothly from the rush into the coast. */
const COAST_FROM = SLIDE_SEC / (SLIDE_SEC + COAST_SEC);
export const SLEDDERS = 2;

/**
 * A point on the hill's face `along` the run, 0 the top and 1 the foot, `above` uphill of it. Below
 * the hills' middles their face leans out over the run, so something `tall` standing there is set
 * out in front of the face as far up as its top reaches.
 */
export function runPoint(along: number, above = 0, tall = 0) {
  const x = RUN_TOP.x + (RUN_FOOT.x - RUN_TOP.x) * along;
  const y = RUN_TOP.y + (RUN_FOOT.y - RUN_TOP.y) * along + above;
  const face = Math.max(hillFront(x, y) ?? -22, hillFront(x, y + tall) ?? -22);
  return { x, y, z: face + (tall > 0 ? 0.3 : 0.04) };
}

export type SledPose = {
  /** 0 the top of the run, 1 its foot. */
  along: number;
  /** How far uphill of the run they are: 0 on it, on the way back up beside it. */
  above: number;
  /** Seated on the sled and moving, as a share of top speed: 0 to 1; 0 off the sled. */
  speed: number;
  /** Seated on the sled (sliding, coasting or waiting at the top) rather than on foot. */
  seated: boolean;
  /** Which way they face along the run: 1 down it, -1 back up. */
  facing: 1 | -1;
  /** The walking step, -1 to 1, while trudging back up; 0 otherwise. */
  stride: number;
};

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/** Sledder `i` at `time`. `still` holds the first sat at the top and the second halfway back up. */
export function sledderAt(i: number, time: number, still = false): SledPose {
  const t = still ? (i === 0 ? LOOP_SEC - 1 : SLIDE_SEC + COAST_SEC + RISE_SEC + CLIMB_SEC / 2) : ((((time + (i * LOOP_SEC) / SLEDDERS) % LOOP_SEC) + LOOP_SEC) % LOOP_SEC);
  if (t < SLIDE_SEC) {
    // Gathering speed down the slope.
    const k = t / SLIDE_SEC;
    return { along: COAST_FROM * k * k, above: 0, speed: k, seated: true, facing: 1, stride: 0 };
  }
  if (t < SLIDE_SEC + COAST_SEC) {
    // Coasting out on the flatter foot, slowing to a stop: the speed carried over runs out as it arrives.
    const k = (t - SLIDE_SEC) / COAST_SEC;
    return { along: COAST_FROM + (1 - COAST_FROM) * (1 - (1 - k) * (1 - k)), above: 0, speed: 1 - k, seated: true, facing: 1, stride: 0 };
  }
  if (t < SLIDE_SEC + COAST_SEC + RISE_SEC) {
    // Getting up and stepping up off the run.
    const k = smooth((t - SLIDE_SEC - COAST_SEC) / RISE_SEC);
    return { along: 1, above: CLIMB_ABOVE * k, speed: 0, seated: false, facing: -1, stride: 0 };
  }
  const settle = LOOP_SEC - SETTLE_SEC;
  if (t < settle) {
    const s = t - SLIDE_SEC - COAST_SEC - RISE_SEC;
    return { along: 1 - s / CLIMB_SEC, above: CLIMB_ABOVE, speed: 0, seated: false, facing: -1, stride: Math.sin((s / 0.75) * Math.PI) };
  }
  // Stepping back onto the run at the top, turning the sled round and sitting down.
  const k = smooth((t - settle) / (SETTLE_SEC * 0.5));
  return { along: 0, above: CLIMB_ABOVE * (1 - k), speed: 0, seated: k >= 1, facing: k >= 1 ? 1 : -1, stride: 0 };
}

/** A sled kicks up a puff of snow every SPRAY_SEC / SPRAY_PUFFS seconds while it runs fast; each lasts SPRAY_SEC. */
export const SPRAY_PUFFS = 10;
export const SPRAY_SEC = 0.9;

/**
 * Puff `j` of the snow spray behind sledder `i`'s sled at `time`, the `j`th newest: how long ago it was
 * kicked up and where along the run, or null when the sled was not running fast then.
 */
export function sprayPuff(i: number, j: number, time: number, still = false): { age: number; along: number } | null {
  if (still) return null;
  const every = SPRAY_SEC / SPRAY_PUFFS;
  const kicked = (Math.floor(time / every) - j) * every;
  const pose = sledderAt(i, kicked);
  if (!pose.seated || pose.speed < 0.25 || pose.along <= 0) return null;
  return { age: time - kicked, along: pose.along };
}
