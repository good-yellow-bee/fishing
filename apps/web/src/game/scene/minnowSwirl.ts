import type { LakeHour } from "@stillwater/shared";

/** Minnows milling in the dock lanterns' glow after dark; Lite effects keep the first half. */
export const MINNOW_COUNT = 10;
/** The lit water just off the dock's lake end, under its two lanterns. */
export const MINNOW_POOL = { x: 0, z: 4.3, r: 1.4 } as const;
/** Just under the surface, so they read as glints through the water. */
export const MINNOW_DEPTH = 0.05;

/** Out when the dock lanterns burn full, the hours the lantern bite holds (lanternDockWaitMul). */
export function minnowsOut(hour: LakeHour): boolean {
  return hour === "night";
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export type MinnowPose = { x: number; z: number; yaw: number };

/**
 * Where minnow `i` is at time `t`: each circles the pool on its own ring, speed and direction, with a slow
 * in-and-out weave, nose along its path. `still` holds every minnow at its starting place for reduced motion.
 */
export function minnowAt(i: number, t: number, still = false): MinnowPose {
  const ring = MINNOW_POOL.r * (0.35 + 0.65 * unit(i + 1));
  const dir = unit(i + 7) < 0.5 ? 1 : -1;
  const speed = dir * (0.5 + 0.6 * unit(i + 13));
  const time = still ? 0 : t;
  const angle = unit(i + 19) * Math.PI * 2 + time * speed;
  const weave = 0.12 * Math.sin(time * 1.7 + i * 2.3);
  const r = Math.max(0.15, Math.min(MINNOW_POOL.r, ring + weave));
  const x = MINNOW_POOL.x + Math.cos(angle) * r;
  const z = MINNOW_POOL.z + Math.sin(angle) * r;
  // Heading along the circle for a body whose nose points down +x: a turn of yaw about y sends +x to (cos, -sin).
  const yaw = Math.atan2(-Math.cos(angle) * dir, -Math.sin(angle) * dir);
  return { x, z, yaw };
}
