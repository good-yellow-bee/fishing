import { inLake } from "@stillwater/shared";
import { CABIN_AT, CABIN_SCALE, CABIN_WALLS, CABIN_YAW } from "./cabinLook";

/**
 * The cabin's lit windows mirrored in the lake: from wherever you stand, each window's light lies on
 * the water as a short, broken streak of warm glints running toward you, where the line from your
 * eye to the window's mirror image meets the surface. Pure in time.
 */

export type Vec3 = { x: number; y: number; z: number };

/** Each window's middle in the world: either side of the door on the cabin's front wall, as Cabin.tsx draws them. */
export const CABIN_WINDOW_LIGHTS: readonly Vec3[] = [-0.8, 0.8].map((wx) => {
  const x = wx * CABIN_SCALE;
  const z = (CABIN_WALLS.depth / 2) * CABIN_SCALE;
  const cos = Math.cos(CABIN_YAW);
  const sin = Math.sin(CABIN_YAW);
  return { x: CABIN_AT.x + x * cos + z * sin, y: 0.95 * CABIN_SCALE, z: CABIN_AT.z - x * sin + z * cos };
});

export const GLINTS_PER_WINDOW = 8;
/** How long each streak runs, in metres, mostly on the near side of the true reflection. */
const STREAK = 2.6;

/** Where the light's reflection meets the water, seen from `eye`: the eye's height over the eye's plus the light's, of the way across. */
export function reflectionPoint(eye: Vec3, light: Vec3) {
  const k = eye.y / (eye.y + light.y);
  return { x: eye.x + (light.x - eye.x) * k, z: eye.z + (light.z - eye.z) * k };
}

export type Glint = { x: number; z: number; scale: number; alpha: number };

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** The glints of window `w`'s reflection seen from `eye` at `time`, as `lightGlints` strings them. */
export function windowGlints(w: number, eye: Vec3, time: number, still = false): Glint[] {
  return lightGlints(CABIN_WINDOW_LIGHTS[w]!, w, eye, time, still);
}

/**
 * The glints of a `light`'s reflection seen from `eye` at `time`: strung along the line toward the
 * eye, swaying a little on the ripples and winking in and out. None when the reflection falls on land.
 * `w` numbers the light, so each one's glints wink to their own beat.
 */
export function lightGlints(light: Vec3, w: number, eye: Vec3, time: number, still = false): Glint[] {
  const at = reflectionPoint(eye, light);
  if (!inLake(at.x, at.z)) return [];
  const dx = eye.x - at.x;
  const dz = eye.z - at.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const glints: Glint[] = [];
  for (let k = 0; k < GLINTS_PER_WINDOW; k += 1) {
    const seed = w * 17 + k * 5;
    // From a little beyond the true reflection to well on the near side of it.
    const along = (k / (GLINTS_PER_WINDOW - 1) - 0.25) * STREAK;
    const sway = still ? 0 : Math.sin(time * (0.9 + unit(seed) * 0.8) + seed) * 0.08;
    const x = at.x + ux * along - uz * sway;
    const z = at.z + uz * along + ux * sway;
    if (!inLake(x, z)) continue;
    const wink = still ? 0.7 : 0.5 + 0.5 * Math.sin(time * (1.6 + unit(seed + 1) * 1.8) + unit(seed + 2) * 6.28);
    // Brightest at the true reflection, fading along the streak.
    const fade = 1 - Math.min(1, Math.abs(along) / STREAK) * 0.7;
    glints.push({ x, z, scale: 0.55 + unit(seed + 3) * 0.6, alpha: wink * fade });
  }
  return glints;
}
