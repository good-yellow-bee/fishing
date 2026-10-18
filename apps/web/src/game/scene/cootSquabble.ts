import type { LakeHour, LakeSeason } from "@stillwater/shared";

/**
 * A pair of coots on the water by the lily bed at the lake's west end, from spring to fall. Each
 * paddles a slow loop of its own, nodding its head at every stroke, and now and then dives and
 * comes up a little way on. In spring they squabble over the patch: one charges, pattering across
 * the surface with its wings half open and spray kicked up, the other runs ahead of it, and then
 * both paddle slowly back. Pure in time.
 */

type Spot = { x: number; z: number };

export const COOT_COUNT = 2;
/** The middle of each coot's loop, its size, and how fast it goes round (radians a second). */
const LOOPS = [
  { x: -13.9, z: -8.2, rx: 0.5, rz: 0.8, rate: 0.09, start: 0 },
  { x: -13.3, z: -10.4, rx: 0.45, rz: 0.5, rate: -0.07, start: 2.1 },
] as const;
/** How often each dives, how long it stays down, and where in the round it goes. */
export const DIVE_EVERY_SEC = 21;
const DIVE_SEC = 3.4;
const DIVE_AT = [6, 15] as const;
/** The spring squabble: how often, how long the charge lasts, how far it carries them, and the paddle back. */
export const SQUABBLE_EVERY_SEC = 38;
const CHARGE_SEC = 2.6;
const CHARGE_LEN = 3.2;
const BACK_SEC = 16;
const SQUABBLE_AT = 9;
/** Which way the charge runs: out from the lilies toward the open water, clear of the canoe's turn. */
const CHARGE_DIR = { x: -0.2, z: 0.98 };
/** How long after the fleeing coot its chaser sets off. */
const CHASER_LAG = 0.35;

/** Out from dawn to dusk from spring to fall. */
export function cootsOut(hour: LakeHour, season: LakeSeason) {
  return hour !== "night" && season !== "winter";
}

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function wrap(time: number, every: number) {
  return ((time % every) + every) % every;
}

/** How far along the charge line a coot is, `t` seconds into the squabble round; `lag` holds the chaser back. */
function chargeOffset(t: number, lag: number) {
  const into = t - SQUABBLE_AT - lag;
  if (into < 0) return 0;
  if (into < CHARGE_SEC) return smooth(into / CHARGE_SEC) * CHARGE_LEN;
  return CHARGE_LEN * (1 - smooth((into - CHARGE_SEC) / BACK_SEC));
}

function placeAt(index: number, time: number, squabbling: boolean): Spot {
  const loop = LOOPS[index];
  const a = loop.start + time * loop.rate;
  const spot = { x: loop.x + Math.cos(a) * loop.rx, z: loop.z + Math.sin(a) * loop.rz };
  if (!squabbling) return spot;
  // The first coot, further along the charge line, flees; the second chases from behind.
  const t = wrap(time, SQUABBLE_EVERY_SEC);
  const along = chargeOffset(t, index === 0 ? 0 : CHASER_LAG);
  return { x: spot.x + CHARGE_DIR.x * along, z: spot.z + CHARGE_DIR.z * along };
}

export type CootPose = Spot & {
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** The head nodding forward with each paddle stroke, -1 to 1. */
  nod: number;
  /** How far under the water it is on a dive, 0 afloat to 1 gone. */
  under: number;
  /** Pattering across the surface in the squabble, wings half open and spray flying, 0 to 1. */
  patter: number;
};

/** Coot `index` at `time`. `squabbling` lets the spring charge play; `still` holds them afloat, side by side. */
export function cootAt(index: number, time: number, squabbling: boolean, still = false): CootPose {
  if (still) {
    const loop = LOOPS[index];
    return { x: loop.x, z: loop.z, yaw: Math.PI / 2, nod: 0, under: 0, patter: 0 };
  }
  const here = placeAt(index, time, squabbling);
  const ahead = placeAt(index, time + 0.1, squabbling);
  const behind = placeAt(index, time - 0.1, squabbling);
  const yaw = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  const t = wrap(time, SQUABBLE_EVERY_SEC) - SQUABBLE_AT - (index === 0 ? 0 : CHASER_LAG);
  const patter = squabbling && t > 0 && t < CHARGE_SEC ? Math.sin((Math.PI * t) / CHARGE_SEC) ** 0.5 : 0;
  // A dive that would run into the charge is skipped whole, so neither is ever cut short.
  const d = wrap(time, DIVE_EVERY_SEC) - DIVE_AT[index];
  const from = wrap(time - d, SQUABBLE_EVERY_SEC);
  const clash = squabbling && from < SQUABBLE_AT + CHARGE_SEC + 1 && from + DIVE_SEC > SQUABBLE_AT - 0.5;
  const down = d > 0 && d < DIVE_SEC && !clash;
  const under = down ? Math.min(smooth(d / 0.35), smooth((DIVE_SEC - d) / 0.35)) : 0;
  return { x: here.x, z: here.z, yaw, nod: patter > 0 ? 0 : Math.sin(time * 5.5 + index * 2), under, patter };
}
