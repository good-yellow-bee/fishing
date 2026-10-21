import { WORM_TIN_WET } from "../wormTin";

/**
 * How the worms in the worm tin (GT465) lie: each one curls over the rim at its own spot round it, mostly on the side
 * toward the camera behind the angler, and slowly wriggles, its hanging end lifting and dropping and swaying along
 * the rim. Pure.
 */

/** At most this many worms show over the rim, as many as the tin can hold. */
export const TIN_WORMS_SHOWN = WORM_TIN_WET;

/** Where round the rim each worm curls over, turned from the tin's left (+x) toward the camera (-z, at π/2). */
const AROUND = [Math.PI / 2, Math.PI / 2 + 0.8, Math.PI / 2 - 0.75, Math.PI / 2 + 1.55, Math.PI / 2 - 1.5] as const;
/** How far its hanging end lifts and drops, and sways along the rim, in radians. */
export const WORM_LIFT = 0.28;
export const WORM_SWAY = 0.14;

export type TinWorm = { angle: number; tilt: number };

/** Worm `i` (below TIN_WORMS_SHOWN) at `time` in seconds: its turn round the rim, and how far its hanging end is lifted. */
export function tinWorm(i: number, time: number): TinWorm {
  const phase = i * 2.39;
  return {
    angle: AROUND[i] + Math.sin(time * 0.53 + phase) * WORM_SWAY,
    tilt: Math.sin(time * 0.9 + phase) * WORM_LIFT * (0.6 + 0.4 * Math.sin(time * 0.31 + phase * 1.7)),
  };
}
