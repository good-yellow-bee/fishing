import type { LakeSeason, Sky } from "@stillwater/shared";
import { LAKE_CENTER_Z } from "@stillwater/shared";

/**
 * Cattail fluff: white tufts lift off the reed beds in late summer and fall
 * and float away on the breeze, low over the water. Each tuft runs its own
 * staggered cycle as a pure function of time, like the falling leaves.
 */
export const FLUFF_COUNT = 36;
export const FLUFF_LIFE_SEC = 16;
export const FLUFF_CYCLE_SEC = 22;
/** The reed beds the tufts lift from (the middle of each clump). */
export const FLUFF_BEDS = [
  { x: -12.4, z: 1.2 },
  { x: 12.2, z: -10.1 },
  { x: -22.4, z: -11.6 },
] as const;
/** Drift speed in still air, and how much each meter a second of the day's wind drift adds. */
const CALM_SPEED = 0.35;
const WIND_GAIN = 8;

export function fluffOut(season: LakeSeason, sky: Sky | undefined) {
  return (season === "summer" || season === "fall") && sky !== "rain";
}

function hash(i: number) {
  const s = Math.sin(i * 47.3 + 19.1) * 43758.5453;
  return s - Math.floor(s);
}

export type Tuft = { x: number; y: number; z: number; alpha: number };

/** Tuft `index` at `time`, or null between its flights. */
export function tuftAt(index: number, time: number, wind: { x: number; z: number }): Tuft | null {
  const offset = hash(index) * FLUFF_CYCLE_SEC;
  const shifted = time + offset;
  const into = ((shifted % FLUFF_CYCLE_SEC) + FLUFF_CYCLE_SEC) % FLUFF_CYCLE_SEC;
  if (into >= FLUFF_LIFE_SEC) return null;
  const round = Math.floor(shifted / FLUFF_CYCLE_SEC);
  const bed = FLUFF_BEDS[index % FLUFF_BEDS.length]!;
  // Lifts from a fresh head in the clump each time.
  const startX = bed.x + (hash(index * 13 + round * 5) - 0.5) * 1.6;
  const startZ = bed.z + (hash(index * 7 + round * 11) - 0.5) * 1.4;
  const windSpeed = Math.hypot(wind.x, wind.z);
  // In still air the tufts wander out over the lake; any breeze carries them downwind.
  let dirX = windSpeed > 0 ? wind.x / windSpeed : -bed.x;
  let dirZ = windSpeed > 0 ? wind.z / windSpeed : LAKE_CENTER_Z - bed.z;
  const span = Math.hypot(dirX, dirZ) || 1;
  dirX /= span;
  dirZ /= span;
  const veer = (hash(index + 3) - 0.5) * 0.6;
  const vx = dirX * Math.cos(veer) - dirZ * Math.sin(veer);
  const vz = dirX * Math.sin(veer) + dirZ * Math.cos(veer);
  const speed = CALM_SPEED + windSpeed * WIND_GAIN;
  const wobble = hash(index + 7) * Math.PI * 2;
  const travelled = into * speed;
  return {
    x: startX + vx * travelled + Math.sin(into * 0.9 + wobble) * 0.25,
    y: 0.9 + Math.min(1, into / 3) * 0.6 + Math.sin(into * 1.3 + wobble) * 0.2,
    z: startZ + vz * travelled + Math.cos(into * 0.7 + wobble) * 0.25,
    alpha: Math.min(1, into, (FLUFF_LIFE_SEC - into) / 2),
  };
}
