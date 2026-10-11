/**
 * The landing lift: a landed fish first comes up from under the chop and
 * breaks the surface, then the existing swing carries it to the hand. The
 * landing clock starts at -LIFT_SEC, so every landing curve that clamps at
 * zero simply waits out the rise, and the exit ring opens as the fish breaks
 * the surface. Snaps and slack losses never start a landing.
 */

/** Seconds from deep under the bobber to the surface. */
export const LIFT_SEC = 0.42;

/** Meters under the fight position where the rise starts. */
export const LIFT_DEPTH = 0.5;

/** The landing clock's first value. */
export const LIFT_START_AGE = -LIFT_SEC;

/** Meters still under the surface. Speeds up as it comes, so it bursts through. */
export function liftDepth(age: number) {
  if (age >= 0) return 0;
  const u = Math.min(1, Math.max(0, (age + LIFT_SEC) / LIFT_SEC));
  return LIFT_DEPTH * (1 - u * u);
}

/** Tail beat while it rises: hard, so the body reads as fighting up. */
export function liftFlop(age: number) {
  return age < 0 ? 0.9 : 0;
}
