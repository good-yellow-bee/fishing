import { type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Diamond dust: on bitter, clear, still winter mornings the air itself freezes into tiny ice
 * crystals that hang and sink slowly over the lake, each flashing like a spark for a moment as it
 * turns in the low sun. Pure in time.
 */

/** At dawn and by day in winter, under a clear sky with barely a breath of wind. */
export function diamondDustOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return (hour === "dawn" || hour === "day") && season === "winter" && sky === "clear" && Math.hypot(wind.x, wind.z) < STILL_AIR;
}

export const STILL_AIR = 0.1;
export const CRYSTALS = 180;
/** The box of air they glitter in, in front of the dock, and how fast they sink through it. */
export const DUST_BOX = { minX: -7, maxX: 7, minZ: -2, maxZ: 4.8, low: 0.2, high: 3.2 };
const SINK = 0.06;
/** How far each metre a second of drift carries them, per second. */
const DRIFT = 3;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function wrap(v: number, min: number, max: number) {
  const span = max - min;
  return min + ((((v - min) % span) + span) % span);
}

export type Crystal = { x: number; y: number; z: number; flash: number };

/** Crystal `i` at `time`, its height above the water's rest level, and how brightly it flashes (0 dark to 1). `still` holds them at one moment. */
export function crystalAt(i: number, time: number, wind: { x: number; z: number }, still = false): Crystal {
  const t = still ? 8 : time;
  const b = DUST_BOX;
  const x = wrap(b.minX + hash(i) * (b.maxX - b.minX) + wind.x * DRIFT * t + 0.08 * Math.sin(t * 0.4 + i), b.minX, b.maxX);
  const z = wrap(b.minZ + hash(i + 0.5) * (b.maxZ - b.minZ) + wind.z * DRIFT * t, b.minZ, b.maxZ);
  const y = wrap(b.low + hash(i + 0.25) * (b.high - b.low) - SINK * t, b.low, b.high);
  // Flashes briefly as it tumbles, now and then; never at the wrap, where it fades.
  const edge = Math.min(1, (y - b.low) / 0.3, (b.high - y) / 0.3, (x - b.minX) / 0.5, (b.maxX - x) / 0.5, (z - b.minZ) / 0.5, (b.maxZ - z) / 0.5);
  const spin = 0.8 + hash(i + 0.75) * 1.6;
  const flash = Math.max(0, Math.sin(t * spin + hash(i + 0.6) * 20)) ** 14;
  return { x, y, z, flash: Math.max(0, edge) * (0.12 + 0.88 * flash) };
}
