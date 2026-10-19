import { DOCK_PLANKS, type LakeSeason } from "@stillwater/shared";

/**
 * Hail: now and then a spring or summer shower turns to hail for a short burst. White pellets
 * rattle down on the dock, bounce once or twice on the boards and lie there melting away, and
 * out on the water in front of the dock each one kicks up a little white spout. Pure in time.
 */

/** In rain from spring to summer; winter's showers fall as snow and fall's stay rain. */
export function hailOut(rain: boolean, season: LakeSeason) {
  return rain && (season === "spring" || season === "summer");
}

/** A burst of hail comes this often, lasting this long, easing in and out over RAMP_SEC. */
export const HAIL_EVERY_SEC = 140;
export const HAIL_SEC = 22;
const RAMP_SEC = 4;
/** The first burst comes this long into the shower. */
const FIRST_SEC = 25;

/** How hard it is hailing at `time`: 0 none, 1 the height of the burst. */
export function hailStrength(time: number) {
  const since = (((time - FIRST_SEC) % HAIL_EVERY_SEC) + HAIL_EVERY_SEC) % HAIL_EVERY_SEC;
  if (since >= HAIL_SEC) return 0;
  const edge = Math.min(since, HAIL_SEC - since) / RAMP_SEC;
  if (edge >= 1) return 1;
  return edge * edge * (3 - 2 * edge);
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Pellets on the planks at once, and the stages of each: falling, bouncing, lying, melting. */
export const DOCK_PELLETS = 60;
const DROP_HEIGHT = 2.6;
const FALL_SEC = 0.22;
const BOUNCES = [
  { height: 0.2, sec: 0.4 },
  { height: 0.06, sec: 0.22 },
];
const BOUNCE_SEC = BOUNCES.reduce((sum, b) => sum + b.sec, 0);
export const LIE_SEC = 7;
export const MELT_SEC = 3;
const CYCLE_SEC = FALL_SEC + BOUNCE_SEC + LIE_SEC + MELT_SEC + 1;
/** How far a pellet skips sideways across its bounces. */
const SKIP = 0.22;

export type Pellet = { x: number; y: number; z: number; size: number };

/** When pellet `i`'s cycle that holds `time` began, and whether it fell at all (not if the hail was light then). */
function pelletCycle(i: number, time: number, period: number) {
  const offset = unit(i * 3 + 1) * period;
  const cycle = Math.floor((time + offset) / period);
  const start = cycle * period - offset;
  const seed = i * 131 + cycle * 17;
  // Lands only while it hails, more of them the harder it comes.
  const fell = unit(seed + 5) < hailStrength(start + FALL_SEC);
  return { start, seed, fell };
}

/** Pellet `i` on the dock at `time`, from its fall to its last melting; null when it is not about. `still` shows none. */
export function dockPellet(i: number, time: number, still = false): Pellet | null {
  if (still) return null;
  const { start, seed, fell } = pelletCycle(i, time, CYCLE_SEC);
  if (!fell) return null;
  const age = time - start;
  const x0 = DOCK_PLANKS.minX + 0.08 + unit(seed) * (DOCK_PLANKS.maxX - DOCK_PLANKS.minX - 0.16);
  const z0 = DOCK_PLANKS.minZ + 0.08 + unit(seed + 1) * (DOCK_PLANKS.maxZ - DOCK_PLANKS.minZ - 0.16);
  const heading = unit(seed + 2) * Math.PI * 2;
  const skip = SKIP * (0.4 + 0.6 * unit(seed + 3));
  const big = 0.024 + unit(seed + 4) * 0.016;
  const top = DOCK_PLANKS.top + big;
  if (age < FALL_SEC) return { x: x0, y: top + DROP_HEIGHT * (1 - age / FALL_SEC), z: z0, size: big };
  let t = age - FALL_SEC;
  let along = 0;
  for (const bounce of BOUNCES) {
    const share = bounce.sec / BOUNCE_SEC;
    if (t < bounce.sec) {
      const k = t / bounce.sec;
      const s = skip * (along + share * k);
      return { x: x0 + Math.cos(heading) * s, y: top + 4 * bounce.height * k * (1 - k), z: z0 + Math.sin(heading) * s, size: big };
    }
    t -= bounce.sec;
    along += share;
  }
  const x = x0 + Math.cos(heading) * skip;
  // Keep it on the boards.
  const z = z0 + Math.sin(heading) * skip;
  if (x < DOCK_PLANKS.minX + 0.03 || x > DOCK_PLANKS.maxX - 0.03 || z < DOCK_PLANKS.minZ + 0.03 || z > DOCK_PLANKS.maxZ - 0.03) return null;
  if (t < LIE_SEC) return { x, y: top, z, size: big };
  t -= LIE_SEC;
  if (t < MELT_SEC) {
    const size = big * (1 - t / MELT_SEC);
    return { x, y: DOCK_PLANKS.top + size, z, size };
  }
  return null;
}

/** Pellets landing on the water in front of the dock at once, the patch they land in, and how long each spout lasts. */
export const WATER_PELLETS = 40;
export const WATER_PATCH = { minX: -4.5, maxX: 4.5, minZ: 0.5, maxZ: 5 };
const SPOUT_CYCLE_SEC = 1.4;
export const SPOUT_SEC = 0.45;
const SPOUT_HEIGHT = 0.24;

export type Spout = { x: number; z: number; height: number; ring: number; fade: number };

/** The spout pellet `i` kicks up from the water at `time`; null between them. `still` shows none. */
export function waterSpout(i: number, time: number, still = false): Spout | null {
  if (still) return null;
  const { start, seed, fell } = pelletCycle(i + 1000, time, SPOUT_CYCLE_SEC);
  if (!fell) return null;
  const age = time - start - FALL_SEC;
  if (age < 0 || age > SPOUT_SEC) return null;
  const k = age / SPOUT_SEC;
  return {
    x: WATER_PATCH.minX + unit(seed) * (WATER_PATCH.maxX - WATER_PATCH.minX),
    z: WATER_PATCH.minZ + unit(seed + 1) * (WATER_PATCH.maxZ - WATER_PATCH.minZ),
    // Leaps up and drops back, while its ring spreads.
    height: SPOUT_HEIGHT * 4 * k * (1 - k) * (0.7 + 0.6 * unit(seed + 2)),
    ring: 0.04 + 0.16 * k,
    fade: 1 - k,
  };
}
