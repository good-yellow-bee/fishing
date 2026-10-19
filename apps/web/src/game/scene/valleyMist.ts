import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Valley mist: on calm, clear dawns from spring to fall a long low bank of mist lies along the foot
 * of the hills behind the far bank, the far trees' trunks fading into it and their crowns standing
 * clear above, its soft puffs drifting slowly to and fro. Pure in time.
 */

/** A wind this light leaves the mist lying: a still day's drift is under 0.03, a breezy one's 0.08. */
export const LIES = 0.06;

/** At dawn from spring to fall, under a clear or broken sky with the air still. */
export function valleyMistOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "dawn" && season !== "winter" && (sky === "clear" || sky === "partly-cloudy") && Math.hypot(wind.x, wind.z) < LIES;
}

export const PUFFS = 22;
/** Across the view behind the far bank, from west to east. */
const FROM_X = -24;
const ACROSS = 48;
/** Between the far trees and the hills' foot, from front to back, in the middle of the view. */
const FRONT_Z = -18.2;
const DEPTH = 2.6;
/** Metres either way a puff drifts, and seconds for one drift there and back. */
const DRIFT = 1.4;
const DRIFT_SEC = 70;

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type ValleyPuff = { x: number; y: number; z: number; width: number; height: number };

/** Puff `i` at `time`: long and low, spread evenly along the bank with a little jitter. `still` holds each at home. */
export function valleyPuff(i: number, time: number, still = false): ValleyPuff {
  const home = FROM_X + ACROSS * ((i + 0.5 + (hash(i) - 0.5) * 0.7) / PUFFS);
  const sway = still ? 0 : DRIFT * Math.sin(((time + DRIFT_SEC * hash(i + 30)) / DRIFT_SEC) * Math.PI * 2);
  const x = home + sway;
  const y = 0.55 + 0.7 * hash(i + 60);
  // Out to the sides the hills come forward: keep in front of their face.
  const face = hillFront(x, y);
  return {
    x,
    y,
    z: Math.max(FRONT_Z - DEPTH * hash(i + 90), face === null ? -Infinity : face + 0.4),
    width: 4.5 + 2.5 * hash(i + 120),
    height: 1.3 + 0.6 * hash(i + 150),
  };
}
