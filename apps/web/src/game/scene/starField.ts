import { inLake } from "@stillwater/shared";

/** Stars on a clear night; Lite effects keep every other one. */
export const STAR_COUNT = 700;
/** Inside the sky dome (radius 90), so the dome never covers them. */
export const STAR_RADIUS = 84;
/** Lowest star above the horizon, in radians; the treeline hides anything lower. */
export const STAR_LOW = 0.1;
/** Seconds between shooting stars, at most; each one gets its own seeded wait inside that. */
export const SHOOTING_GAP = 40;
/** Seconds a shooting star takes to cross. */
export const SHOOTING_SEC = 0.7;

/** A fixed 0..1 for a star and a salt, so the sky is the same every night. */
function unit(index: number, salt: number) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type Star = { x: number; y: number; z: number; brightness: number };

/** Star `index` on the dome: spread evenly over the sky above the treeline, most of them faint. */
export function starAt(index: number): Star {
  const azimuth = unit(index, 1) * Math.PI * 2;
  // Even over the dome: sin(elevation) is uniform between the low line and the top.
  const lowSin = Math.sin(STAR_LOW);
  const elevation = Math.asin(lowSin + unit(index, 2) * (1 - lowSin));
  const ring = Math.cos(elevation) * STAR_RADIUS;
  return {
    x: Math.cos(azimuth) * ring,
    y: Math.sin(elevation) * STAR_RADIUS,
    z: Math.sin(azimuth) * ring,
    brightness: 0.35 + unit(index, 3) ** 3 * 0.65,
  };
}

/**
 * Where star `star` shows in the still lake for an eye at `eye`: the reflected
 * sight line, (x, -y, z), followed down to the water. Null when it lands off
 * the water or the eye is not above it.
 */
export function starReflection(star: Star, eye: { x: number; y: number; z: number }): { x: number; z: number } | null {
  if (eye.y <= 0) return null;
  const t = eye.y / star.y;
  const x = eye.x + star.x * t;
  const z = eye.z + star.z * t;
  return inLake(x, z) ? { x, z } : null;
}

/**
 * Where a point in the sky, such as a shooting star, shows in the still lake
 * for an eye at `eye`: the sight line to its mirror image (x, -y, z), met at
 * the water. Null when it lands off the water or either sits below it.
 */
export function skyPointReflection(point: readonly [number, number, number], eye: { x: number; y: number; z: number }): { x: number; z: number } | null {
  const [px, py, pz] = point;
  if (eye.y <= 0 || py <= 0) return null;
  const t = eye.y / (eye.y + py);
  const x = eye.x + (px - eye.x) * t;
  const z = eye.z + (pz - eye.z) * t;
  return inLake(x, z) ? { x, z } : null;
}

/** How strongly the stars show: only on a clear night, and a bright moon washes the faint ones out. */
export function starOpacity(night: boolean, clear: boolean, moonLight: number) {
  if (!night || !clear) return 0;
  return 0.95 - 0.45 * Math.min(1, Math.max(0, moonLight));
}

export type ShootingStar = { from: [number, number, number]; to: [number, number, number]; progress: number };

/** The shooting star crossing at `time`, if one is: each gap gets a seeded start and a path low across the northern sky. */
export function shootingStar(time: number): ShootingStar | null {
  const slot = Math.floor(time / SHOOTING_GAP);
  const start = slot * SHOOTING_GAP + unit(slot, 4) * (SHOOTING_GAP - SHOOTING_SEC);
  const progress = (time - start) / SHOOTING_SEC;
  if (progress < 0 || progress > 1) return null;
  // Low over the far shore, so its mirror image crosses the open lake in view of the dock rather than under it.
  const x = (unit(slot, 5) * 2 - 1) * 45;
  const y = 16 + unit(slot, 6) * 14;
  const dir = unit(slot, 7) < 0.5 ? -1 : 1;
  return { from: [x, y, -100], to: [x + dir * 24, y - 7, -100], progress };
}
