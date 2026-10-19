import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";
import { FIELDS } from "./hayField";

/**
 * Tractor: on summer days a little red tractor works the western hay field on the far hills, driving
 * slowly along it between the rows of bales, swinging round at each end and driving back. Pure in time.
 */

/** Out on dry summer days. */
export function tractorOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "summer" && sky !== "rain" && sky !== "fog";
}

const FIELD = FIELDS[0];
/** The run's west and east ends, inside the field, and its height on the hills' face: between the rows of bales. */
export const RUN_WEST = FIELD.x - FIELD.halfX * 0.72;
export const RUN_EAST = FIELD.x + FIELD.halfX * 0.72;
export const RUN_Y = FIELD.rows[0].y + 0.32;
/** Metres a second along the run, and seconds to swing round at each end. */
const SPEED = 0.35;
const TURN_SEC = 3.5;
const RUN_SEC = (RUN_EAST - RUN_WEST) / SPEED;
export const LOOP_SEC = 2 * (RUN_SEC + TURN_SEC);
/** How far up the slope the swing round reaches, at its widest. */
const SWING = 0.3;
/** The tractor's height, before its scale: the face is found up to here. */
const HEIGHT = 0.5;
export const TRACTOR_SCALE = 0.75;

export type TractorPose = { x: number; y: number; z: number; /** Facing, about the vertical: π/2 east, -π/2 west. */ yaw: number };

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/** Out in front of the hills' face at `x`, `y`, as far up as its cab reaches. */
function onFace(x: number, y: number) {
  return Math.max(hillFront(x, y) ?? -30, hillFront(x, y + HEIGHT * TRACTOR_SCALE) ?? -30) + 0.2;
}

/** The tractor at `time`. `still` holds it halfway along the run, heading east. */
export function tractorAt(time: number, still = false): TractorPose {
  const t = still ? RUN_SEC / 2 : ((time % LOOP_SEC) + LOOP_SEC) % LOOP_SEC;
  let x: number;
  let y = RUN_Y;
  let yaw: number;
  if (t < RUN_SEC) {
    x = RUN_WEST + SPEED * t;
    yaw = Math.PI / 2;
  } else if (t < RUN_SEC + TURN_SEC) {
    // Swinging round at the east end: up the slope a little and back.
    const k = smooth((t - RUN_SEC) / TURN_SEC);
    x = RUN_EAST + 0.25 * Math.sin(Math.PI * k);
    y = RUN_Y + SWING * Math.sin(Math.PI * k);
    yaw = Math.PI / 2 + Math.PI * k;
  } else if (t < 2 * RUN_SEC + TURN_SEC) {
    x = RUN_EAST - SPEED * (t - RUN_SEC - TURN_SEC);
    yaw = (3 * Math.PI) / 2;
  } else {
    const k = smooth((t - 2 * RUN_SEC - TURN_SEC) / TURN_SEC);
    x = RUN_WEST - 0.25 * Math.sin(Math.PI * k);
    y = RUN_Y + SWING * Math.sin(Math.PI * k);
    yaw = (3 * Math.PI) / 2 + Math.PI * k;
  }
  return { x, y, z: onFace(x, y), yaw };
}
