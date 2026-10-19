import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Cap cloud: on grey and wet days low cloud hangs on the tops of the hills behind the far bank,
 * hiding the upper slopes in soft grey wreaths that drift slowly along the ridge with the wind,
 * thicker in the rain. Pure in time.
 */

/** Down on the hills under a grey or rainy sky, at any hour and season. */
export function capCloudOut(_hour: LakeHour, sky: Sky | undefined, _season: LakeSeason) {
  return sky === "overcast" || sky === "rain";
}

/** How thick it hangs: in the rain it comes lower and denser. */
export function capCloudAmount(sky: Sky | undefined) {
  return sky === "rain" ? 1 : sky === "overcast" ? 0.7 : 0;
}

export const WREATHS = 16;
/** Along the ridge from west to east, wrapping round as they drift. */
const FROM_X = -22;
const ACROSS = 44;
/** The cloud's base on the slopes, and how far up the wreaths reach above it. */
const BASE_Y = 4.7;
const SPREAD_Y = 1.6;
/** Metres a second the wreaths drift along the ridge on a still day, and for each metre a second of the wind's drift across. */
const CALM_DRIFT = 0.04;
const PER_WIND = 6;

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Wreath = { x: number; y: number; z: number; width: number; height: number };

/** The drift along the ridge in the day's wind: downwind east or west, never quite still. */
export function capDrift(wind: { x: number; z: number }) {
  const along = wind.x * PER_WIND;
  return Math.abs(along) < CALM_DRIFT ? (along < 0 ? -CALM_DRIFT : CALM_DRIFT) : along;
}

/** Wreath `i` at `time`, `amount` thick (lower when thicker). `still` holds each at home. */
export function wreathAt(i: number, time: number, wind: { x: number; z: number }, amount = 1, still = false): Wreath {
  const home = ACROSS * ((i + 0.5 + (hash(i) - 0.5) * 0.6) / WREATHS);
  const moved = still ? 0 : capDrift(wind) * time;
  const x = FROM_X + ((((home + moved) % ACROSS) + ACROSS) % ACROSS);
  const y = BASE_Y - 0.5 * amount + SPREAD_Y * hash(i + 60);
  const height = 1.4 + 0.9 * hash(i + 150);
  // Standing out in front of the hills' face from its foot to its top.
  let face = -30;
  for (let up = -height / 2; up <= height / 2; up += 0.25) face = Math.max(face, hillFront(x, y + up) ?? -30);
  return { x, y, z: face + 0.5 + 0.6 * hash(i + 90), width: 5 + 3 * hash(i + 120), height };
}
