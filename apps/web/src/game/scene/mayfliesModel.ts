import type { SpotId } from "@stillwater/shared";
import { PLACES } from "../hotspot";

/**
 * The mayfly hatch that comes with the evening rise: little swarms over the open water in reach of the bank,
 * each fly dancing the way mayflies do, a quick climb and a slow parachute down. A pure function of time.
 */
export const MAYFLY_SWARMS = 5;
export const FLIES_PER_SWARM = 12;
export const MAYFLY_COUNT = MAYFLY_SWARMS * FLIES_PER_SWARM;
/** The low point of the dance over the water, and how high each climb takes it. */
export const MAYFLY_LOW = 0.35;
export const MAYFLY_CLIMB = 0.9;
export const DANCE_UP_SEC = 0.5;
export const DANCE_DOWN_SEC = 1.7;
/** How far a fly's home sits from its swarm's middle. */
export const SWARM_RADIUS = 0.9;

export type Mayfly = { x: number; y: number; z: number };

function hash(i: number) {
  const s = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** Evenly spread swarm middles over the water this bank can reach, so some are always in view. */
export function swarmCenters(spot: SpotId): { x: number; z: number }[] {
  const places = PLACES[spot];
  return Array.from({ length: MAYFLY_SWARMS }, (_, i) => places[Math.floor(((i + 0.5) * places.length) / MAYFLY_SWARMS)]!);
}

/** One fly at `time`. `still` keeps it hovering mid-dance for reduced motion. */
export function mayfly(index: number, centers: readonly { x: number; z: number }[], time: number, still = false): Mayfly {
  const center = centers[Math.floor(index / FLIES_PER_SWARM) % centers.length]!;
  const angle = hash(index) * Math.PI * 2;
  const reach = Math.sqrt(hash(index + 101)) * SWARM_RADIUS;
  const x = center.x + Math.cos(angle) * reach;
  const z = center.z + Math.sin(angle) * reach;
  if (still) return { x, y: MAYFLY_LOW + MAYFLY_CLIMB / 2, z };
  const cycle = DANCE_UP_SEC + DANCE_DOWN_SEC;
  const into = (((time + hash(index + 7) * cycle) % cycle) + cycle) % cycle;
  let lift: number;
  if (into < DANCE_UP_SEC) {
    const k = into / DANCE_UP_SEC;
    lift = 1 - (1 - k) * (1 - k);
  } else {
    lift = 1 - (into - DANCE_UP_SEC) / DANCE_DOWN_SEC;
  }
  const drift = 0.15;
  return {
    x: x + Math.sin(time * 0.7 + index) * drift,
    y: MAYFLY_LOW + lift * MAYFLY_CLIMB,
    z: z + Math.cos(time * 0.6 + index * 1.3) * drift,
  };
}
