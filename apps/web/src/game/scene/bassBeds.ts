import type { LakeSeason } from "@stillwater/shared";

export type BassBed = { x: number; z: number; radius: number; phase: number };

/** The bass beds: one in the Reeds shallows, one beside the dock's sunfish beds; wider than any sunfish nest. */
export const BASS_BEDS: readonly BassBed[] = [
  { x: -10.2, z: 8.8, radius: 0.55, phase: 0.8 },
  { x: 1.7, z: 5.7, radius: 0.5, phase: 3.9 },
];

/** The bass guard their beds in spring only. */
export function bassBedsOut(season: LakeSeason) {
  return season === "spring";
}

/** How often a sunfish strays near a bed, and how long the face-off lasts, in seconds. */
export const FACE_OFF_EVERY = 11;
export const FACE_OFF_LENGTH = 3;

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothstep(a: number, b: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function turnToward(from: number, to: number, w: number) {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * w;
}

/** Where a bed's face-off stands `time` seconds in: how far through it is (0..1), and the stray's bearing from the middle; null between face-offs. */
export function faceOff(bed: BassBed, time: number) {
  const t = time + bed.phase * 3;
  const cycle = Math.floor(t / FACE_OFF_EVERY);
  const into = t - cycle * FACE_OFF_EVERY;
  if (into >= FACE_OFF_LENGTH) return null;
  return { u: into / FACE_OFF_LENGTH, bearing: seeded(cycle, bed.phase) * Math.PI * 2 };
}

/**
 * The sunfish straying near, `time` seconds in: it noses in from beyond the rim to just over it,
 * turns tail when the bass faces it and slips back off; null between face-offs and for reduced motion.
 */
export function straySpot(bed: BassBed, time: number, still = false) {
  const off = still ? null : faceOff(bed, time);
  if (!off) return null;
  const dx = Math.sin(off.bearing);
  const dz = Math.cos(off.bearing);
  const reach = bed.radius * (2.6 - 1.4 * Math.sin(Math.PI * off.u));
  const inward = Math.atan2(-dx, -dz);
  return {
    x: bed.x + dx * reach,
    z: bed.z + dz * reach,
    yaw: inward + Math.PI * smoothstep(0.42, 0.6, off.u),
    size: Math.min(1, 5 * Math.sin(Math.PI * off.u)),
  };
}

/**
 * The bass guarding its bed, `time` seconds in: it hangs over the middle, drifting slowly and
 * facing its way, and when a sunfish strays near it turns to face it, edges out toward it and
 * settles back. Reduced motion holds it over the middle.
 */
export function bassSpot(bed: BassBed, time: number, still = false) {
  if (still) return { x: bed.x, z: bed.z, yaw: bed.phase };
  const t = time * 0.25 + bed.phase;
  const reach = bed.radius * 0.3;
  let x = bed.x + Math.cos(t) * reach * Math.sin(t * 0.41);
  let z = bed.z + Math.sin(t * 1.2) * reach * 0.8;
  const dx = -Math.sin(t) * Math.sin(t * 0.41) + Math.cos(t) * 0.41 * Math.cos(t * 0.41);
  const dz = 1.2 * Math.cos(t * 1.2) * 0.8;
  let yaw = Math.atan2(dx, dz);
  const off = faceOff(bed, time);
  if (off) {
    const face = smoothstep(0.05, 0.3, off.u) * (1 - smoothstep(0.7, 1, off.u));
    const edge = smoothstep(0.2, 0.5, off.u) * (1 - smoothstep(0.55, 0.95, off.u));
    x += (bed.x + Math.sin(off.bearing) * bed.radius * 0.5 - x) * edge;
    z += (bed.z + Math.cos(off.bearing) * bed.radius * 0.5 - z) * edge;
    yaw = turnToward(yaw, off.bearing, face);
  }
  return { x, z, yaw };
}
