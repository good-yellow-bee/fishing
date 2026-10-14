import { inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";

/**
 * Cat's-paws: on a breezy day, gusts roughen patches of the water that sweep
 * across the lake downwind and fade. Each patch runs its own staggered cycle as
 * a pure function of time and the day's wind.
 */
export const GUST_COUNT = 4;
export const GUST_LIFE_SEC = 5;
export const GUST_CYCLE_SEC = 7;
/** The slowest wind drift (as WIND_DRIFT gives it) that raises them: breezy and up. */
export const GUST_MIN_WIND = 0.08;
/** How fast a patch runs, metres a second, for each metre a second of wind drift. */
const GUST_GAIN = 28;

export function gustsOut(windSpeed: number) {
  return windSpeed >= GUST_MIN_WIND;
}

function hash(i: number) {
  const s = Math.sin(i * 73.1 + 11.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Gust = { x: number; z: number; yaw: number; alpha: number; length: number; width: number };

/** Patch `index` at `time`, or null between gusts or off the water. */
export function gustAt(index: number, time: number, wind: { x: number; z: number }): Gust | null {
  const speed = Math.hypot(wind.x, wind.z);
  if (!gustsOut(speed)) return null;
  const offset = hash(index) * GUST_CYCLE_SEC;
  const shifted = time + offset;
  const into = ((shifted % GUST_CYCLE_SEC) + GUST_CYCLE_SEC) % GUST_CYCLE_SEC;
  if (into >= GUST_LIFE_SEC) return null;
  const round = Math.floor(shifted / GUST_CYCLE_SEC);
  const ux = wind.x / speed;
  const uz = wind.z / speed;
  const run = speed * GUST_GAIN;
  // Starts somewhere on the lake, set back upwind by half its run so it crosses where it was placed.
  const a = hash(index * 19 + round * 7) * Math.PI * 2;
  const r = Math.sqrt(hash(index * 5 + round * 13)) * 0.7;
  const midX = Math.cos(a) * LAKE_RX * r;
  const midZ = LAKE_CENTER_Z + Math.sin(a) * LAKE_RZ * r;
  const travelled = (into - GUST_LIFE_SEC / 2) * run;
  const x = midX + ux * travelled;
  const z = midZ + uz * travelled;
  if (!inLake(x, z)) return null;
  const k = into / GUST_LIFE_SEC;
  return {
    x,
    z,
    // Lies across the wind: long side square to it.
    yaw: Math.atan2(ux, uz),
    alpha: Math.sin(k * Math.PI),
    length: 4 + hash(index + round) * 2,
    width: 7 + hash(index * 3 + round) * 4,
  };
}
