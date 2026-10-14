import type { LakeHour, LakeSeason, Sky as WeatherSky } from "@stillwater/shared";
import { REED_BEDS } from "./fireflies";

/**
 * Dragonflies over the reed beds on warm dry days. Each one hovers at a spot
 * for a moment, then darts to the next; the spots are hashed, so the flight is
 * a pure function of time and tests and screenshots agree.
 */

/** How many work each reed bed (west shallows, east point, creek mouth). */
export const DRAGONFLY_BEDS = REED_BEDS.map((bed, i) => ({ x: bed.x, z: bed.z, flies: i === 0 ? 3 : 2 }));
export const DRAGONFLY_COUNT = DRAGONFLY_BEDS.reduce((sum, bed) => sum + bed.flies, 0);
/** Meters a hover spot may sit from its bed, and the height band it hunts in. */
export const DRAGONFLY_RANGE = 2.4;
export const DRAGONFLY_LOW = 0.5;
export const DRAGONFLY_HIGH = 1.5;
/** Seconds for one dart between spots. */
export const DART_SEC = 0.35;

export type Dragonfly = { x: number; y: number; z: number; yaw: number; darting: boolean };

/** Out on dry spring and summer days and evenings. */
export function dragonfliesOut(hour: LakeHour, sky: WeatherSky, season: LakeSeason) {
  return (hour === "day" || hour === "dusk") && sky !== "rain" && (season === "spring" || season === "summer");
}

function hash(i: number) {
  const s = Math.sin(i * 91.7 + 47.3) * 43758.5453;
  return s - Math.floor(s);
}

const FLIES = DRAGONFLY_BEDS.flatMap((bed, b) =>
  Array.from({ length: bed.flies }, (_, f) => {
    const seed = b * 100 + f;
    return { bed, seed, hover: 1.1 + hash(seed + 3) * 1.4, offset: hash(seed + 7) * 10 };
  }),
);

/** The k-th hover spot of a fly: a hashed point inside its bed's range. */
function spot(seed: number, k: number) {
  const s = seed * 1000 + k * 13;
  const angle = hash(s + 1) * Math.PI * 2;
  const reach = Math.sqrt(hash(s + 2)) * DRAGONFLY_RANGE;
  return { dx: Math.cos(angle) * reach, dz: Math.sin(angle) * reach, y: DRAGONFLY_LOW + hash(s + 5) * (DRAGONFLY_HIGH - DRAGONFLY_LOW) };
}

/** One dragonfly at `time`. `still` keeps it hovering at its first spot for reduced motion. */
export function dragonfly(index: number, time: number, still = false): Dragonfly {
  const fly = FLIES[((index % DRAGONFLY_COUNT) + DRAGONFLY_COUNT) % DRAGONFLY_COUNT]!;
  const cycle = fly.hover + DART_SEC;
  const t = still ? 0 : time + fly.offset;
  const k = Math.floor(t / cycle);
  const into = t - k * cycle;
  const here = spot(fly.seed, k);
  const bob = still ? 0 : Math.sin(time * 5.3 + fly.seed) * 0.03;
  if (still || into < fly.hover) {
    const before = spot(fly.seed, k - 1);
    return { x: fly.bed.x + here.dx, y: here.y + bob, z: fly.bed.z + here.dz, yaw: Math.atan2(here.dx - before.dx, here.dz - before.dz), darting: false };
  }
  const next = spot(fly.seed, k + 1);
  const u = (into - fly.hover) / DART_SEC;
  const ease = u * u * (3 - 2 * u);
  return {
    x: fly.bed.x + here.dx + (next.dx - here.dx) * ease,
    y: here.y + (next.y - here.y) * ease + bob,
    z: fly.bed.z + here.dz + (next.dz - here.dz) * ease,
    yaw: Math.atan2(next.dx - here.dx, next.dz - here.dz),
    darting: true,
  };
}
