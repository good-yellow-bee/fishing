import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Sheep: by day in spring and fall a little flock grazes the western field on the hills behind the
 * far bank, turned out on the young grass in spring with their lambs and on the stubble after the
 * hay in fall. Each drifts slowly along the slope, head down, and turns back; the lambs trot after
 * their mothers and now and then skip. Pure in time.
 */

/** Out by day in spring and fall, unless it is pouring or foggy. */
export function sheepOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && (season === "spring" || season === "fall") && sky !== "rain" && sky !== "fog";
}

/** Each ewe's patch: the middle of its stretch along the slope, how far either way it drifts, and its ground's height. Between the field's rows of bales. */
export const EWES = [
  { x: -0.9, reach: 0.12, y: 2.45 },
  { x: 3.25, reach: 0.15, y: 2.45 },
  { x: 0.2, reach: 0.2, y: 2.45 },
  { x: 0.6, reach: 0.2, y: 2.7 },
  { x: 1.15, reach: 0.2, y: 2.5 },
  { x: 2.6, reach: 0.25, y: 2.65 },
] as const;
/** The ewes the lambs follow in spring, by index. */
export const LAMB_MOTHERS = [3, 5, 1] as const;
/** A sheep is drawn at this scale, a lamb smaller again; a sheep stands this tall. */
export const SHEEP_SCALE = 0.7;
export const LAMB_SCALE = 0.55;
const HEIGHT = 0.36;
/** Metres a second a ewe drifts while grazing. */
const DRIFT = 0.025;

export type SheepPose = { x: number; y: number; z: number; /** Which way along the slope it faces: 1 east, -1 west. */ facing: 1 | -1; /** Lift off the ground, for a lamb's skip. */ hop: number };

/** Out in front of the hills' face at `x`, `y`, as far up as its back. */
function onFace(x: number, y: number) {
  return Math.max(hillFront(x, y) ?? -30, hillFront(x, y + HEIGHT * SHEEP_SCALE) ?? -30) + 0.18;
}

/** Ewe `i` at `time`: drifting to and fro across its patch. `still` holds each in the middle. */
export function eweAt(i: number, time: number, still = false): SheepPose {
  const ewe = EWES[i]!;
  const legSec = (2 * ewe.reach) / DRIFT;
  const t = still ? legSec / 2 : time + i * 11.7;
  const leg = Math.floor(t / legSec);
  const facing: 1 | -1 = leg % 2 === 0 ? 1 : -1;
  const into = (t - leg * legSec) / legSec;
  const x = ewe.x - facing * ewe.reach + facing * 2 * ewe.reach * into;
  return { x, y: ewe.y, z: onFace(x, ewe.y), facing: still ? (i % 2 === 0 ? 1 : -1) : facing, hop: 0 };
}

/** Lamb `j` at `time`: a little behind its mother and below her, now and then skipping. */
export function lambAt(j: number, time: number, still = false): SheepPose {
  const mother = eweAt(LAMB_MOTHERS[j]!, time, still);
  const x = mother.x - mother.facing * 0.32;
  const y = mother.y - 0.2;
  // A skip of half a second, every nine or so, each lamb on its own beat.
  const beat = (((time + j * 3.1) % 9) + 9) % 9;
  const hop = still || beat > 0.5 ? 0 : 0.12 * Math.sin((beat / 0.5) * Math.PI);
  return { x, y, z: onFace(x, y), facing: mother.facing, hop };
}
