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

export type ReedStem = { x: number; y: number; z: number; yaw: number; scale: number; phase: number };

/** Where stem `index` of a clump rooted at `origin` stands: rows of four going back, each turned and sized a little differently. */
export function reedStem(origin: readonly [number, number, number], index: number): ReedStem {
  return {
    x: origin[0] + (index % 4) * 0.52,
    y: origin[1],
    z: origin[2] - Math.floor(index / 4) * 0.44,
    yaw: index * 0.73,
    scale: 1.45 + (index % 3) * 0.16,
    phase: index * 1.9 + origin[0],
  };
}
