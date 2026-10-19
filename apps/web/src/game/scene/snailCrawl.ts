import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A snail out on the dock's planks behind the angler in the rain and on dewy mornings, from spring
 * to fall: it glides a slow loop across the boards, its body stretching and drawing in as it goes
 * and its eye stalks swaying, a wet trail drying behind it. Pure in time.
 */

type Spot = { x: number; z: number };

/** The loop it works, behind where the angler stands: its middle and half-width across and along the dock. */
const LOOP = { x: DOCK_STAND_X, z: DOCK_STAND_Z + 0.9, rx: 0.5, rz: 0.2 };
/** Its pace, in metres a second: a snail's, a little brisk so it reads. */
const PACE = 0.006;
/** How much trail lies behind it before it dries away, in metres. */
export const TRAIL_LENGTH = 0.45;
export const SNAIL_Y = DOCK_PLANKS.top;

/** Out in the rain and on dewy mornings, from spring to fall. */
export function snailOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season !== "winter" && (sky === "rain" || hour === "dawn");
}

/** The loop's length, near enough (Ramanujan's ellipse). */
const PERIMETER = Math.PI * (3 * (LOOP.rx + LOOP.rz) - Math.sqrt((3 * LOOP.rx + LOOP.rz) * (LOOP.rx + 3 * LOOP.rz)));
export const LOOP_SEC = PERIMETER / PACE;

/** The point `metres` along the loop. */
export function loopAt(metres: number): Spot {
  const a = (metres / PERIMETER) * Math.PI * 2;
  return { x: LOOP.x + Math.cos(a) * LOOP.rx, z: LOOP.z + Math.sin(a) * LOOP.rz };
}

export type SnailPose = Spot & {
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** The body stretched out (1) or drawn in (-1) with each wave of its crawl. */
  stretch: number;
  /** The eye stalks swaying side to side, -1 to 1. */
  sway: number;
};

/** The snail `time` seconds in. `still` holds it where it starts, stretched out. */
export function snailAt(time: number, still = false): SnailPose {
  const t = still ? 0 : Math.max(0, time);
  const along = t * PACE;
  const here = loopAt(along);
  const ahead = loopAt(along + 0.01);
  return {
    ...here,
    yaw: Math.atan2(ahead.x - here.x, ahead.z - here.z),
    stretch: still ? 0 : Math.sin(t * 1.6),
    sway: still ? 0 : Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1),
  };
}

/** Points along the trail behind it at `time`, the newest first: `count` of them over the trail's length, or less while it is new. */
export function trailAt(time: number, count: number, still = false): Spot[] {
  const along = (still ? 0 : Math.max(0, time)) * PACE;
  const length = Math.min(TRAIL_LENGTH, along);
  return Array.from({ length: count }, (_, k) => loopAt(along - 0.03 - (length * k) / Math.max(1, count - 1)));
}
