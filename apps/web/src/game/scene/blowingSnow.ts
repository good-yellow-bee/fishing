import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Spindrift: on breezy or windy winter days the wind lifts the loose snow off the hills behind the
 * far bank and streams it along their faces in long, thin wisps, and skims it low along the far
 * shore, each wisp gathering, racing downwind and thinning away. Pure in time.
 */

/** A wind this strong lifts the snow: a breezy day's drift is 0.08, a strong one's 0.13. */
export const LIFTS = 0.07;

/** On winter mornings and days with wind enough, when it is not snowing or foggy (falling snow and fog would hide it). */
export function spindriftOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return (hour === "dawn" || hour === "day") && season === "winter" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) >= LIFTS;
}

/** How hard it blows, 0 to 1: a breezy day about half, a strong one full. */
export function spindriftStrength(wind: { x: number; z: number }) {
  return Math.min(1, Math.max(0, (Math.hypot(wind.x, wind.z) - 0.04) / 0.09));
}

/** Which way along the far bank the wisps race: with the wind's east-west part, east in a wind straight up or down the lake. */
export function driftSide(wind: { x: number; z: number }): 1 | -1 {
  return wind.x < -0.01 ? -1 : 1;
}

export const WISPS = 36;
/** Wisps on the hills' faces; the rest skim the shore. */
export const HILL_WISPS = 24;
/** Seconds a wisp lives, at the least and most. */
const LIFE_MIN = 3;
const LIFE_SPAN = 2.5;
/** Across the view: the far bank and hills from west to east. */
const FROM_X = -20;
const ACROSS = 40;
/** Metres a second the snow races at full strength. */
const SPEED = 5;
/** How far back from the far shore's water the low wisps skim, at the least and most. */
const SHORE_BACK = 1.6;
const SHORE_SPREAD = 1.6;

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Wisp = { x: number; y: number; z: number; length: number; thick: number };

/** Wisp `i` at `time` in this wind, or null while it is between lives. `still` lays them out at rest, faint. */
export function wispAt(i: number, time: number, wind: { x: number; z: number }, still = false): Wisp | null {
  const strength = spindriftStrength(wind);
  if (strength <= 0) return null;
  const life = LIFE_MIN + LIFE_SPAN * hash(i);
  const cycle = life + 0.3 + 1.2 * hash(i + 50);
  const shifted = time + cycle * hash(i + 99);
  const round = still ? 0 : Math.floor(shifted / cycle);
  const t = still ? life * 0.5 : shifted - round * cycle;
  if (t >= life) return null;
  const seed = i * 31 + round * 7;
  const k = t / life;
  const side = driftSide(wind);
  const travel = SPEED * strength * (0.7 + 0.6 * hash(seed + 1)) * t;
  const x = FROM_X + ACROSS * hash(seed + 2) + side * travel;
  const swell = Math.sin(Math.PI * k);
  if (i < HILL_WISPS) {
    // Up the hills' faces, lifting a little as it goes.
    const y = 1.6 + 4 * hash(seed + 3) + 0.5 * k;
    const face = hillFront(x, y);
    if (face === null) return null;
    return { x, y, z: face + 0.4, length: (1.5 + 2.5 * hash(seed + 4)) * (0.6 + 0.4 * swell), thick: (0.35 + 0.4 * hash(seed + 5)) * swell };
  }
  // Low along the far shore, skimming the snow.
  const shore = LAKE_CENTER_Z - LAKE_RZ * Math.sqrt(Math.max(0, 1 - (x / LAKE_RX) ** 2));
  return { x, y: 0.15 + 0.25 * hash(seed + 3), z: shore - SHORE_BACK - SHORE_SPREAD * hash(seed + 6), length: (1 + 2 * hash(seed + 4)) * (0.6 + 0.4 * swell), thick: (0.2 + 0.25 * hash(seed + 5)) * swell };
}
