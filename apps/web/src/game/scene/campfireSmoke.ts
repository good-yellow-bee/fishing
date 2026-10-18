import { SHOP_X, SHOP_Z, type LakeHour, type Sky } from "@stillwater/shared";

/** The fire pit on the grass beside the shack's seat logs, clear of where the angler stands. */
export const FIRE_AT = { x: SHOP_X - 1.9, z: SHOP_Z - 0.2 };
/** Puffs of smoke in the air at once, and the seconds each takes to rise and thin away. */
export const PUFF_COUNT = 14;
export const PUFF_RISE_SEC = 7;
/** How high a puff climbs before it is gone, in metres. */
const RISE = 3.2;
/** How far a puff leans downwind at the top of its climb for each metre a second of wind, and on a still day. */
const LEAN_PER_WIND = 25;
const CALM_LEAN = 0.3;

/** The fire is lit from dusk to dawn, but not in the rain. */
export function campfireLit(hour: LakeHour, sky: Sky | undefined) {
  return hour !== "day" && sky !== "rain";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Puff = { x: number; y: number; z: number; size: number; alpha: number };

/**
 * Puff `i` of the fire's smoke at `time`: rising from the flames, swelling and thinning as it climbs,
 * and bending over downwind, slowly at first and then more the higher it gets, the way a smoke trail
 * leans in a breeze. Heights are above the fire.
 */
export function smokePuff(i: number, time: number, wind: { x: number; z: number }): Puff {
  const k = (((time / PUFF_RISE_SEC + i / PUFF_COUNT) % 1) + 1) % 1;
  const speed = Math.hypot(wind.x, wind.z);
  const dir = speed < 1e-4 ? { x: 0.6, z: -0.8 } : { x: wind.x / speed, z: wind.z / speed };
  const lean = (CALM_LEAN + speed * LEAN_PER_WIND) * k * k;
  const wobble = Math.sin(time * 0.9 + i * 2.1) * 0.12 * k;
  return {
    x: FIRE_AT.x + dir.x * lean - dir.z * wobble + (seeded(i, 1) - 0.5) * 0.08,
    y: 0.25 + k * RISE * (1 - Math.min(0.5, speed * 4) * k),
    z: FIRE_AT.z + dir.z * lean + dir.x * wobble + (seeded(i, 2) - 0.5) * 0.08,
    size: 0.25 + k * 1.1,
    // Thick just over the flames, thinning to nothing at the top.
    alpha: Math.min(1, k / 0.08) * (1 - k) * 0.8,
  };
}

/** How bright the flames burn at `time`, about 1, flickering. `still` holds it steady for reduced motion. */
export function flicker(time: number, still = false) {
  if (still) return 1;
  return 0.85 + 0.1 * Math.sin(time * 11.3) + 0.05 * Math.sin(time * 23.7 + 1.3);
}
