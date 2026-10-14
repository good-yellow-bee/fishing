import type { LakeSeason, Sky } from "@stillwater/shared";

/**
 * Rain dripping off the angler's cap: in the rain, drops gather at points
 * round the brim and fall one after another. Winter rain falls as snow, so
 * there are none then. Pure functions of time.
 */
export const DRIP_POINTS = 6;
/** Height of the brim above the feet, and how far out from the middle of the head the drops let go. */
export const BRIM_UP = 0.98;
export const BRIM_REACH = 0.37;
/** Seconds a drop takes to fall, and how fast it falls. */
export const DRIP_FALL_SEC = 0.5;
const GRAVITY = 9.8;

export function dripsOut(sky: Sky | undefined, season: LakeSeason) {
  return sky === "rain" && season !== "winter";
}

function unit(i: number, salt: number) {
  const s = Math.sin(i * 33.7 + salt * 17.9) * 43758.5453;
  return s - Math.floor(s);
}

export type Drip = { angle: number; drop: number; size: number };

/** The drop at brim point `i` at `time`, or null while the next one gathers: the angle round the brim (0 dead ahead) and how far it has fallen. */
export function dripAt(i: number, time: number): Drip | null {
  const period = 0.8 + unit(i, 1) * 0.9;
  const since = (time + unit(i, 2) * period) % period;
  if (since > DRIP_FALL_SEC) return null;
  // Drops gather mostly at the front and back of the brim, where it dips.
  const angle = (i / DRIP_POINTS) * Math.PI * 2 + (unit(i, 3) - 0.5) * 0.5;
  return { angle, drop: 0.5 * GRAVITY * since * since, size: 0.6 + unit(i, 4) * 0.4 };
}
