import { inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { waterDepth } from "./water";

/**
 * Whitecaps: on a breezy day a few wave crests break white out on the open water, and on a strong day many
 * more. Each cap runs its own staggered cycle as a pure function of time and the day's wind: it breaks,
 * slides a little downwind as its foam spreads, and fades.
 */
export const WHITECAP_MAX = 24;
/** The slowest wind drift (as WIND_DRIFT gives it) that breaks crests: breezy and up. */
export const WHITECAP_MIN_WIND = 0.07;
/** How many caps break for each meter a second of drift past the threshold. */
const CAPS_PER_DRIFT = 270;
/** A cap shows for this long out of each cycle. */
export const WHITECAP_LIFE_SEC = 1.6;
const CYCLE_MIN_SEC = 2.8;
const CYCLE_SPREAD_SEC = 2.4;
/** Meters a cap slides over its life for each meter a second of drift. */
const SLIDE_GAIN = 9;
/** Only out where the water is deep: crests don't break on the shelf. */
const MIN_DEPTH = 0.25;

export function whitecapCount(windSpeed: number) {
  if (windSpeed < WHITECAP_MIN_WIND) return 0;
  return Math.min(WHITECAP_MAX, Math.round((windSpeed - WHITECAP_MIN_WIND + 0.03) * CAPS_PER_DRIFT));
}

function hash(i: number) {
  const s = Math.sin(i * 91.3 + 17.9) * 43758.5453;
  return s - Math.floor(s);
}

export type Whitecap = { x: number; z: number; yaw: number; alpha: number; scale: number };

/** Cap `index` at `time`, or null between breaks, past the day's count or over the shallows. */
export function whitecapAt(index: number, time: number, wind: { x: number; z: number }): Whitecap | null {
  const speed = Math.hypot(wind.x, wind.z);
  if (index >= whitecapCount(speed)) return null;
  const cycle = CYCLE_MIN_SEC + hash(index * 3 + 1) * CYCLE_SPREAD_SEC;
  const shifted = time + hash(index) * cycle;
  const into = ((shifted % cycle) + cycle) % cycle;
  if (into >= WHITECAP_LIFE_SEC) return null;
  const round = Math.floor(shifted / cycle);
  const a = hash(index * 19 + round * 7) * Math.PI * 2;
  const r = Math.sqrt(hash(index * 5 + round * 13)) * 0.85;
  const k = into / WHITECAP_LIFE_SEC;
  const ux = wind.x / speed;
  const uz = wind.z / speed;
  const slide = k * speed * SLIDE_GAIN;
  const x = Math.cos(a) * LAKE_RX * r + ux * slide;
  const z = LAKE_CENTER_Z + Math.sin(a) * LAKE_RZ * r + uz * slide;
  if (!inLake(x, z) || waterDepth(x, z) < MIN_DEPTH) return null;
  // Breaks bright at once, then the foam thins out.
  const alpha = k < 0.12 ? k / 0.12 : (1 - k) / 0.88;
  return {
    x,
    z,
    // The crest lies across the wind.
    yaw: Math.atan2(ux, uz),
    alpha,
    // A strong wind breaks bigger crests; the foam spreads as it fades.
    scale: (0.7 + hash(index * 7 + round) * 0.6) * (0.75 + Math.min(1, speed / 0.13) * 0.35) * (0.8 + k * 0.5),
  };
}
