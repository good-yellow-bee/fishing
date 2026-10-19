import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Paraglider: on fine, breezy days from spring to fall a paraglider soars the ridge of the hills
 * behind the far bank, riding the wind up the slope. It beats slowly along the hills one way,
 * swings round in a wide turn, banking, and beats back, rising and sinking a little in the lift.
 * Pure in time.
 */

/** The weakest wind's drift (m/s) that holds a paraglider up on the ridge. */
export const SOAR_WIND = 0.04;

/** Out on fine days from spring to fall with enough wind to soar. */
export function paragliderOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season !== "winter" && (sky === "clear" || sky === "partly-cloudy") && Math.hypot(wind.x, wind.z) >= SOAR_WIND;
}

/** The beat along the ridge: its middle, how far either way it reaches, and its height. */
export const BEAT = { x: -2, reach: 5.5, y: 5.25 };
/** Seconds for a whole circuit, out along the ridge and back. */
export const LOOP_SEC = 80;
/** How far out from the hills' face the near side of its circuit swings, and the far side. */
const NEAR = 2.6;
const FAR = 1.4;
/** The wing's height above the pilot, before scaling: the face is checked up to here. */
const WING_UP = 0.75;
export const GLIDER_SCALE = 1.2;

export type GliderPose = { x: number; y: number; z: number; /** Facing about the vertical, toward +z at 0. */ yaw: number; /** Bank, leaning into the turn. */ bank: number };

/** The hills' face in front of `x`, as high as the wing at `y`. */
function face(x: number, y: number) {
  let front = -30;
  for (let up = 0; up <= WING_UP * GLIDER_SCALE; up += 0.25) front = Math.max(front, hillFront(x, y + up) ?? -30);
  return front;
}

/** The glider at `time`. `still` holds it midway along the beat, heading east. */
export function gliderAt(time: number, still = false): GliderPose {
  const t = still ? 0 : time;
  const a = (2 * Math.PI * t) / LOOP_SEC;
  // An oval: east along the near side, round, and west along the far side. It lingers on the straights.
  const along = Math.sin(a);
  const x = BEAT.x + BEAT.reach * along;
  const out = (NEAR + FAR) / 2 + ((NEAR - FAR) / 2) * Math.cos(a);
  const y = BEAT.y + 0.22 * Math.sin(a * 3 + 0.7);
  const z = face(x, y) + out;
  const vx = BEAT.reach * Math.cos(a);
  const vz = -((NEAR - FAR) / 2) * Math.sin(a) * 4;
  const yaw = Math.atan2(vx, vz);
  // Banks into each turn, at the ends of the beat where it swings round.
  const bank = -0.4 * Math.sin(a) * Math.max(0, 1 - Math.abs(Math.cos(a)) * 1.4);
  return { x, y, z, yaw, bank };
}
