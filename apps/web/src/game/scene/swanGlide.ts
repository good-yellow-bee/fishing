import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A pair of mute swans gliding a slow loop on the far water by day in spring
 * and summer, one a length behind the other. Now and then each tips its head
 * under to feed, and comes back up.
 */
export const SWAN_LOOP = { x: -3, z: -10, rx: 8, rz: 2.2 };
/** Radians a second around the loop: a swan's unhurried glide. */
const GLIDE_RATE = 0.02;
/** Radians the second swan trails the first. */
export const SWAN_TRAIL = 0.22;
/** Seconds between one swan's feeding dips, and how long a dip lasts. */
export const SWAN_DIP_GAP = 19;
export const SWAN_DIP_SEC = 3.2;
/** Seconds the head takes to go under and to come back up. */
const DIP_EASE = 0.6;

export type SwanPose = {
  x: number;
  z: number;
  yaw: number;
  /** 0 neck up, 1 head under. */
  dip: number;
};

/** Out by day and at dawn, spring and summer, but not in the rain. */
export function swansOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  return (hour === "day" || hour === "dawn") && (season === "spring" || season === "summer") && sky !== "rain";
}

/** How far the head is down, `into` seconds into a dip cycle. */
export function swanDip(into: number) {
  const t = ((into % SWAN_DIP_GAP) + SWAN_DIP_GAP) % SWAN_DIP_GAP;
  if (t >= SWAN_DIP_SEC) return 0;
  if (t < DIP_EASE) return t / DIP_EASE;
  if (t > SWAN_DIP_SEC - DIP_EASE) return (SWAN_DIP_SEC - t) / DIP_EASE;
  return 1;
}

/** Swan `k` (0 the leader, 1 the follower) at `time`. */
export function swanPose(k: 0 | 1, time: number): SwanPose {
  const angle = time * GLIDE_RATE - k * SWAN_TRAIL;
  const x = SWAN_LOOP.x + Math.cos(angle) * SWAN_LOOP.rx;
  const z = SWAN_LOOP.z + Math.sin(angle) * SWAN_LOOP.rz;
  // Heading along the loop: the derivative of the ellipse at this angle.
  const yaw = Math.atan2(-Math.sin(angle) * SWAN_LOOP.rx, Math.cos(angle) * SWAN_LOOP.rz);
  // The follower feeds out of step with the leader, so they never both go under at once.
  const dip = swanDip(time + k * (SWAN_DIP_GAP / 2));
  return { x, z, yaw, dip };
}
