/** How many small shadows mill around a float cast into a school. */
export const SCHOOL_SIZE = 4;

/**
 * Where school shadow `i` sits around the float at `time` seconds: each fish
 * keeps its own ring and pace, so the school mills rather than spins as one.
 */
export function schoolPose(i: number, time: number): { dx: number; dz: number; heading: number } {
  const radius = 0.6 + (i % 3) * 0.15;
  const speed = (0.55 + i * 0.13) * (i % 2 === 0 ? 1 : -1);
  const angle = time * speed + (i * 2 * Math.PI) / SCHOOL_SIZE;
  const dx = Math.sin(angle) * radius;
  const dz = Math.cos(angle) * radius * 0.8;
  // Swim along the ring: the tangent turns with the direction of travel.
  const heading = angle + (speed > 0 ? Math.PI / 2 : -Math.PI / 2);
  return { dx, dz, heading };
}

/** How far out the big lurking shadow circles the float, and how fast (radians a second). */
export const LURKER_RADIUS = 1.6;
export const LURKER_SPEED = 0.22;

/** Where the one big shadow of a fish still about the bank sits round the float: a wide, slow ring, well outside the school's. */
export function lurkerPose(time: number): { dx: number; dz: number; heading: number } {
  const angle = time * LURKER_SPEED;
  const dx = Math.sin(angle) * LURKER_RADIUS;
  const dz = Math.cos(angle) * LURKER_RADIUS * 0.8;
  return { dx, dz, heading: angle + Math.PI / 2 };
}
