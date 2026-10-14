import type { LakeHour, LakeSeason } from "@stillwater/shared";

/** Seconds between breaths, and how long one puff hangs in the air. */
export const BREATH_EVERY = 3.4;
export const PUFF_SEC = 1.7;
/** Blobs in one puff. */
export const PUFF_BLOBS = 6;

/** Breath shows in the cold: at dawn, and all day in winter. */
export function breathOut(hour: LakeHour, season: LakeSeason) {
  return hour === "dawn" || season === "winter";
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Age 0..1 through the current puff at `t`, or -1 between puffs. Lite effects (`every` 2) skip every other breath. */
export function puffAge(t: number, every = 1) {
  const period = BREATH_EVERY * every;
  const since = t - Math.floor(t / period) * period;
  return since < PUFF_SEC ? since / PUFF_SEC : -1;
}

export type PuffBlob = { forward: number; up: number; side: number; scale: number; opacity: number };

/**
 * Blob `i` of a puff at `age` (0..1), in metres from the mouth: it blows out
 * forward, slows, lifts a little and swells as it thins away.
 */
export function puffBlob(i: number, age: number): PuffBlob {
  const ease = 1 - (1 - age) * (1 - age);
  const spread = unit(i + 1) - 0.5;
  return {
    forward: ease * (0.14 + unit(i + 5) * 0.12),
    up: age * 0.28 + spread * 0.06,
    side: spread * 0.5 * ease,
    scale: 0.04 + ease * (0.05 + unit(i + 9) * 0.04),
    opacity: Math.min(1, age * 6) * (1 - age),
  };
}
