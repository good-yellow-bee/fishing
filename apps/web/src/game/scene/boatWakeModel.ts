/**
 * The V of wake a boat leaves on the water as it goes: longer and brighter the faster it moves,
 * gone when it stops. Pure.
 */

type Spot = { x: number; z: number };

/** Below this speed (m/s) a boat leaves no wake; at `FULL_SPEED` its wake is at its longest and brightest. */
const STILL_SPEED = 0.04;
const FULL_SPEED = 0.6;
/** The arms' length at the slowest and fastest, how far they open, and the foam's opacity at full speed. */
const SHORT = 1.2;
const LONG = 4.6;
export const WAKE_SPREAD = 0.3;
const BRIGHT = 0.5;

export type WakeLook = { length: number; opacity: number };

/** How the wake looks behind a boat going at `speed` metres a second. */
export function wakeLook(speed: number): WakeLook {
  const fill = Math.min(1, Math.max(0, (speed - STILL_SPEED) / (FULL_SPEED - STILL_SPEED)));
  return { length: SHORT + (LONG - SHORT) * fill, opacity: BRIGHT * Math.sqrt(fill) };
}

/** How fast something following `at` is moving at `time`, in metres a second, from where it is a moment either side. */
export function speedOf(at: (time: number) => Spot, time: number) {
  const before = at(time - 0.1);
  const after = at(time + 0.1);
  return Math.hypot(after.x - before.x, after.z - before.z) / 0.2;
}
