/** Below this the day is calm and a moored boat lies as it was left. */
const CALM = 0.01;
/** The wind at which a boat lies fully head to wind. */
const FULL_WIND = 0.04;
/** The slow sheer back and forth about the wind that a boat at anchor makes, in radians. */
const SHEER = 0.3;

/** The shortest turn from heading `a` to heading `b`, in radians. */
function turn(a: number, b: number) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

/** The yaw that points a boat's bow (its model's +z) toward the wind's source. */
export function headToWind(wind: { x: number; z: number }) {
  return Math.atan2(-wind.x, -wind.z);
}

/**
 * A moored boat's heading `time` seconds in: a calm day leaves it where it was left (`rest`) with a
 * faint drift on the chop; a breeze swings its bow round into the wind, and it sheers slowly to
 * and fro about it on its own beat (`phase`). Reduced motion holds it head to wind, without the sheer.
 */
export function boatHeading(rest: number, wind: { x: number; z: number }, time: number, phase: number, still = false) {
  const speed = Math.hypot(wind.x, wind.z);
  const drift = still ? 0 : Math.sin(time * 0.35 + phase) * 0.04;
  if (speed < CALM) return rest + drift;
  const hold = Math.min(1, (speed - CALM) / (FULL_WIND - CALM));
  const sheer = still ? 0 : Math.sin(time * 0.12 + phase) * SHEER * hold;
  return rest + turn(rest, headToWind(wind)) * hold + sheer + drift;
}
