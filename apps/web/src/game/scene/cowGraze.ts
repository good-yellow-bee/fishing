import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Cows: by day from spring to fall a few black-and-white cows graze the pasture on the hills between
 * the farmstead and the hay fields, each ambling a few steps along the slope, stopping to crop the
 * grass with its head down, and ambling on, back and forth across its own patch. Pure in time.
 */

/** Out to pasture by day from spring to fall, unless it is pouring or foggy. */
export function cowsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season !== "winter" && sky !== "rain" && sky !== "fog";
}

/** Each cow's patch: the middle of its stretch along the slope, how far either way it wanders, and its ground's height. */
export const COWS = [
  { x: -4.3, reach: 0.45, y: 3.75 },
  { x: -3.4, reach: 0.4, y: 4.05 },
  { x: -4.7, reach: 0.3, y: 4.35 },
] as const;
/** Seconds to amble from one end of its patch to the other, and to graze at each stop. */
const AMBLE_SEC = 9;
const GRAZE_SEC = 14;
const LEG_SEC = AMBLE_SEC + GRAZE_SEC;
/** A cow is drawn at this scale, larger than life so it reads at the hills' distance, and stands this tall at the back. */
export const COW_SCALE = 0.75;
const HEIGHT = 0.55;

export type CowPose = {
  x: number;
  y: number;
  z: number;
  /** Which way along the slope it faces: 1 east, -1 west. */
  facing: 1 | -1;
  /** 0 head up, 1 down in the grass. */
  graze: number;
  /** The walking step, -1 to 1, while it ambles; 0 standing. */
  stride: number;
};

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/** Where cow `i` stands on the hills' face at `x`: below the hills' middles the face leans out, so it stands out in front as far up as its back. */
export function cowGround(i: number, x: number) {
  const y = COWS[i]!.y;
  const face = Math.max(hillFront(x, y) ?? -30, hillFront(x, y + HEIGHT * COW_SCALE) ?? -30);
  return { x, y, z: face + 0.25 };
}

/** Cow `i` at `time`. `still` holds each grazing midway across its patch. */
export function cowAt(i: number, time: number, still = false): CowPose {
  const cow = COWS[i]!;
  if (still) return { ...cowGround(i, cow.x), facing: i % 2 === 0 ? 1 : -1, graze: 1, stride: 0 };
  const t = time + i * 7.3;
  const leg = Math.floor(t / LEG_SEC);
  const into = t - leg * LEG_SEC;
  // Legs alternate east and west; each starts where the last left off.
  const facing: 1 | -1 = leg % 2 === 0 ? 1 : -1;
  const from = cow.x - facing * cow.reach;
  const walking = into < AMBLE_SEC;
  const k = walking ? smooth(into / AMBLE_SEC) : 1;
  const x = from + facing * 2 * cow.reach * k;
  // Head goes down soon after it stops and comes up just before it moves on.
  const graze = walking ? 0 : smooth((into - AMBLE_SEC) / 1.2) * smooth((LEG_SEC - into) / 1.2);
  const stride = walking ? Math.sin((into / 0.9) * Math.PI) * Math.min(1, 4 * k * (1 - k) + 0.2) : 0;
  return { ...cowGround(i, x), facing, graze, stride };
}
