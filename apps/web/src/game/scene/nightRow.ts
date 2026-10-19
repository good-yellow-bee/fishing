import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A night row: on calm nights from spring to fall someone rows a wooden boat slowly round the
 * near half of the lake, a lantern hung at the stern laying a wavering streak of light on the
 * black water toward the dock. The boat surges a little with each easy stroke. Pure in time.
 */

/** Out at night from spring to fall on calm water, unless it is raining or foggy. */
export function nightRowOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "night" && season !== "winter" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) < CALM;
}

/** Above this drift the water is too choppy for a quiet row. */
export const CALM = 0.08;
/**
 * The loop it rows: wide and shallow across the lake between the dock and the loon's loop, so the
 * oars, reaching OAR_REACH either side, clear both.
 */
export const ROW_LOOP = { x: 0, z: -2, rx: 12, rz: 2 };
export const OAR_REACH = 1.4;
/** Seconds round the loop, and for one stroke. */
export const LAP_SEC = 150;
export const STROKE_SEC = 2.6;
/** How much each stroke surges the boat on: 0 a steady glide. */
const SURGE = 0.3;

export type RowPose = {
  x: number;
  z: number;
  /** Which way the bow points; the bow is the boat's +z. */
  yaw: number;
  /** Where the stroke is, 0 to 1: the drive with the blades in the water to 0.45, then the recovery. */
  stroke: number;
};

/** The boat `time` seconds in. `still` holds it gliding at the loop's near side, oars level. */
export function nightRowAt(time: number, still = false): RowPose {
  const t = still ? LAP_SEC * 0.25 : time;
  // Fastest mid-drive, easing through the recovery.
  const surged = t - (SURGE * STROKE_SEC * Math.sin((2 * Math.PI * t) / STROKE_SEC - 0.6)) / (2 * Math.PI);
  const a = (2 * Math.PI * surged) / LAP_SEC;
  const { x, z, rx, rz } = ROW_LOOP;
  return {
    x: x + rx * Math.cos(a),
    z: z + rz * Math.sin(a),
    yaw: Math.atan2(-rx * Math.sin(a), rz * Math.cos(a)),
    stroke: still ? 0.7 : (((t / STROKE_SEC) % 1) + 1) % 1,
  };
}

/** The oars' sweep from square across the boat: toward the bow at the catch, past square at the finish. */
const CATCH = 0.6;
const FINISH = -0.5;
export function rowSweep(stroke: number) {
  if (stroke < 0.45) {
    const k = stroke / 0.45;
    return CATCH + (FINISH - CATCH) * (k * k * (3 - 2 * k));
  }
  const k = (stroke - 0.45) / 0.55;
  return FINISH + (CATCH - FINISH) * (k * k * (3 - 2 * k));
}

/** 0 blade buried in the water through the drive, 1 lifted clear through the recovery. */
export function rowBladeUp(stroke: number) {
  if (stroke < 0.43) return 0;
  if (stroke < 0.5) return (stroke - 0.43) / 0.07;
  if (stroke < 0.94) return 1;
  return 1 - (stroke - 0.94) / 0.06;
}

/** The lantern's flame breathing, about 1, never still. */
export function lanternFlicker(time: number, still = false) {
  if (still) return 1;
  return 0.9 + 0.06 * Math.sin(time * 7.3) + 0.04 * Math.sin(time * 13.1 + 1.7);
}
