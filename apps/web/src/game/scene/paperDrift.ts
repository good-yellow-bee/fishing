import { DOCK_STAND_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A paper boat: on fine spring and summer days, every few minutes a little folded paper boat drifts
 * slowly across the water in front of the dock, carried by the breeze, rocking on the ripples and
 * turning lazily as it goes, until it floats off out of sight. Pure in time and the wind.
 */

/** Out by day in spring and summer, not in the rain. */
export function paperBoatOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && (season === "spring" || season === "summer") && sky !== "rain";
}

/** Its way across: between the dock's end and where the line goes in, from one side of the view to the other. */
export const DRIFT_Z = DOCK_STAND_Z - 3.4;
export const DRIFT_FROM_X = -6.5;
export const DRIFT_TO_X = 6.5;
/** How far it wanders either side of its line as it goes. */
export const MEANDER = 0.45;
/** Seconds for a crossing, and between the starts of two. */
export const CROSS_SEC = 95;
export const EVERY_SEC = 240;
/** When the first comes after you arrive. */
const FIRST_SEC = 20;

export type PaperBoatPose = { here: boolean; x: number; z: number; yaw: number; rock: number };

/** Which way it drifts: with the breeze across the view, left to right when it is still. */
export function driftSign(windX: number) {
  return windX < -0.005 ? -1 : 1;
}

/** The paper boat `time` seconds in, drifting with a breeze of `windX` across the view. `still` sets it afloat off to one side of the angler. */
export function paperBoatAt(time: number, windX: number, still = false): PaperBoatPose {
  const sign = driftSign(windX);
  const spot = (u: number) => {
    const x = sign > 0 ? DRIFT_FROM_X + (DRIFT_TO_X - DRIFT_FROM_X) * u : DRIFT_TO_X - (DRIFT_TO_X - DRIFT_FROM_X) * u;
    return { x, z: DRIFT_Z + MEANDER * Math.sin(u * Math.PI * 3.2 + 0.7) };
  };
  if (still) {
    const at = spot(0.3);
    return { here: true, ...at, yaw: 0.6, rock: 0 };
  }
  const since = time - FIRST_SEC;
  const t = since < 0 ? -1 : since % EVERY_SEC;
  if (t < 0 || t >= CROSS_SEC) return { here: false, ...spot(0), yaw: 0, rock: 0 };
  const u = t / CROSS_SEC;
  const at = spot(u);
  // It turns slowly about as it drifts, never quite keeping its bow to the way it goes.
  const yaw = 0.9 * Math.sin(t * 0.07 + 1.1) + 0.4 * Math.sin(t * 0.19);
  return { here: true, ...at, yaw, rock: Math.sin(t * 2.1) * 0.12 + Math.sin(t * 3.3 + 1) * 0.06 };
}
