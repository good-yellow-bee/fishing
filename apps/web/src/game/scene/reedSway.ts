/** The furthest a reed leans over in a strong wind, in radians. */
export const REED_MAX_LEAN = 0.22;
/** Radians of steady lean for each meter a second of the day's wind drift. */
const LEAN_PER_WIND = 1.7;
/** A breath of sway even on a calm day. */
const CALM_SWAY = 0.025;

export type ReedTilt = { x: number; z: number };

/**
 * How far a reed is tipped `time` seconds in: it leans steadily downwind, more the stronger the
 * wind, and nods about that lean on its own beat, faster and wider as the wind gets up. As
 * rotations about world x and z for a stem standing on its base. Reduced motion keeps the lean
 * and drops the nodding.
 */
export function reedTilt(wind: { x: number; z: number }, time: number, phase: number, still = false): ReedTilt {
  const speed = Math.hypot(wind.x, wind.z);
  const dir = speed < 1e-4 ? { x: 1, z: 0 } : { x: wind.x / speed, z: wind.z / speed };
  const lean = Math.min(REED_MAX_LEAN * 0.7, speed * LEAN_PER_WIND);
  const sway = still ? 0 : (CALM_SWAY + speed * 0.7) * Math.sin(time * (1.1 + speed * 9) + phase) * (0.7 + 0.3 * Math.sin(time * 0.37 + phase * 2));
  const tip = Math.min(REED_MAX_LEAN, Math.max(-REED_MAX_LEAN, lean + sway));
  // Turning about +x tips the top toward +z; turning about +z tips it toward -x.
  return { x: tip * dir.z, z: -tip * dir.x };
}
