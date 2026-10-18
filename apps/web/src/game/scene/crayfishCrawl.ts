import type { LakeSeason } from "@stillwater/shared";

/** Where each crayfish keeps house on the bed round the dock's pilings, and which way it first faces. */
export const CRAYFISH_HOMES: readonly { x: number; z: number; yaw: number }[] = [
  { x: 1.2, z: 5.9, yaw: 2.4 },
  { x: -1.3, z: 6.1, yaw: -2.2 },
  { x: 2.4, z: 5.6, yaw: 0.3 },
  { x: -2.4, z: 5.4, yaw: -0.3 },
  { x: -2.0, z: 6.6, yaw: 3.0 },
];
/** One creep forward and dart back, in seconds; the dart itself is over in a blink. */
export const CRAWL_LAP = 12;
const CREEP = 8;
const DART = 0.35;
/** Metres it creeps forward before darting back, and where the dart lands it behind its home. */
const REACH = 0.3;
const BACK = 0.25;

/** Crayfish are about from spring to fall; in winter they sit out the cold under the stones. */
export function crayfishOut(season: LakeSeason) {
  return season !== "winter";
}

export type CrayfishPose = { x: number; z: number; yaw: number; darting: boolean };

/**
 * Crayfish `i`, `time` seconds in: it creeps slowly forward over the bed, claws out in front, then
 * flicks its tail and shoots backwards in a blink, and starts creeping again from there. Its
 * heading wanders slowly. Reduced motion leaves it sat at home.
 */
export function crayfishAt(i: number, time: number, still = false): CrayfishPose {
  const home = CRAYFISH_HOMES[i % CRAYFISH_HOMES.length]!;
  const phase = i * 4.7;
  if (still) return { x: home.x, z: home.z, yaw: home.yaw, darting: false };
  const lap = (((time + phase) % CRAWL_LAP) + CRAWL_LAP) % CRAWL_LAP;
  let s: number;
  let darting = false;
  if (lap < CREEP) {
    const k = lap / CREEP;
    s = -BACK + (REACH + BACK) * k * k * (3 - 2 * k);
  } else if (lap < CREEP + DART) {
    const k = (lap - CREEP) / DART;
    s = REACH - (REACH + BACK) * (1 - (1 - k) * (1 - k));
    darting = true;
  } else {
    s = -BACK;
  }
  const yaw = home.yaw + 0.5 * Math.sin(time * 0.11 + phase);
  // The bow is model +z, as everywhere in the scene: forward is (sin yaw, cos yaw).
  return {
    x: home.x + Math.sin(yaw) * s,
    z: home.z + Math.cos(yaw) * s,
    yaw,
    darting,
  };
}
