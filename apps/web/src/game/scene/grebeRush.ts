import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A pair of grebes in spring. Most of the time they float near each other,
 * shaking their heads; now and then they rise up and rush across the water
 * side by side, necks curved, feet pattering, and settle at the far end.
 */
export const GREBE_A = { x: -8, z: -1 };
export const GREBE_B = { x: -1, z: -3 };
/** Seconds between one rush and the next, and how long the run itself lasts. */
export const RUSH_GAP = 60;
export const RUSH_SEC = 3.6;
/** Seconds into each gap that the rush starts. */
export const RUSH_AT = 40;
/** Seconds rising up at the start, and sinking back down at the end. */
const RISE_SEC = 0.5;
/** Meters the pair sits apart, side by side. */
export const PAIR_GAP = 0.55;

export type GrebePose = {
  x: number;
  z: number;
  yaw: number;
  /** 0 floating, 1 reared up and running on the water. */
  upright: number;
  /** Feet pattering, so the spray shows. */
  rushing: boolean;
  /** Side-to-side head shake while they float, radians. */
  shake: number;
};

export function grebesOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  return season === "spring" && (hour === "dawn" || hour === "day") && sky !== "rain";
}

function ease(u: number) {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

/** Grebe `k` (0 or 1) at `time`. Rushes go A to B, then B to A, turn about. */
export function grebePose(k: 0 | 1, time: number): GrebePose {
  const slot = Math.floor(time / RUSH_GAP);
  const into = time - slot * RUSH_GAP;
  const outbound = slot % 2 === 0;
  const from = outbound ? GREBE_A : GREBE_B;
  const to = outbound ? GREBE_B : GREBE_A;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const span = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  // Side by side: each keeps its own side of the A-B line, whichever way they run.
  const lineX = (GREBE_B.x - GREBE_A.x) / span;
  const lineZ = (GREBE_B.z - GREBE_A.z) / span;
  const side = (k === 0 ? -1 : 1) * (PAIR_GAP / 2);
  const offX = lineZ * side;
  const offZ = -lineX * side;
  const run = into - RUSH_AT;
  let along = run < 0 ? 0 : run >= RUSH_SEC ? 1 : ease(run / RUSH_SEC) * 0.15 + (run / RUSH_SEC) * 0.85;
  if (run >= RUSH_SEC) along = 1;
  let upright = 0;
  if (run >= 0 && run < RUSH_SEC) upright = Math.min(ease(run / RISE_SEC), ease((RUSH_SEC - run) / RISE_SEC));
  // A slow drift together where they wait, and the head shakes of courting birds.
  const drift = Math.sin(time * 0.15) * 0.35;
  const resting = run < 0 || run >= RUSH_SEC;
  const shake = resting ? Math.sin(time * 9 + k) * Math.max(0, Math.sin(time * 0.7 + k * 1.3)) ** 6 * 0.5 : 0;
  return {
    x: from.x + dx * along + offX + (resting ? drift : 0),
    z: from.z + dz * along + offZ,
    // Waiting, they face each other across the line; running, both face the way they go. The drawing eases between.
    yaw: resting ? Math.atan2(lineX, lineZ) + (k === 0 ? 1 : -1) * (Math.PI / 2) : yaw,
    upright,
    rushing: run >= 0 && run < RUSH_SEC,
    shake,
  };
}
