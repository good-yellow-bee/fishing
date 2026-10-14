import { DOCK_STAND_X, DOCK_STAND_Z, inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * Now and then a fish flips clear of the water out on the open lake: purely
 * for looks, it never marks a bite. Each gap of time gets one seeded jump, so
 * the schedule is a pure function of time, like the shooting stars.
 */

/** Seconds between jumps, at most, by hour: fish are livelier at dawn and dusk. */
export function jumpGap(hour: LakeHour): number {
  return hour === "dawn" || hour === "dusk" ? 35 : 75;
}
/** Seconds from leaving the water to landing back in it. */
export const JUMP_SEC = 0.9;
/** Meters the fish clears the water at the top of its arc. */
export const JUMP_HEIGHT = 0.75;
/** Seconds the rings spread after the leap and the landing. */
export const JUMP_RING_SEC = 1.4;
/** No closer to the dock than this, so it never reads as a fish on the line. */
const DOCK_CLEAR = 7;

/** Jumping fish stay down in winter's cold water. */
export function jumpsOn(season: LakeSeason): boolean {
  return season !== "winter";
}

function hash(i: number) {
  const s = Math.sin(i * 83.9 + 31.1) * 43758.5453;
  return s - Math.floor(s);
}

export type FishJump = {
  x: number;
  z: number;
  /** Which way along the water it leaps. */
  yaw: number;
  /** 0..1 through the leap; below 0 or above 1 it is under the water. */
  progress: number;
  /** Seconds since it left the water. */
  since: number;
};

/** Where slot `slot`'s fish comes up: somewhere in the open water, clear of the dock and inside the lake. */
export function jumpSpot(slot: number): { x: number; z: number } {
  for (let k = 0; k < 12; k += 1) {
    const angle = hash(slot * 13 + k) * Math.PI * 2;
    const reach = 0.25 + hash(slot * 13 + k + 0.5) * 0.5;
    const x = Math.cos(angle) * LAKE_RX * reach;
    const z = LAKE_CENTER_Z + Math.sin(angle) * LAKE_RZ * reach;
    if (inLake(x, z) && Math.hypot(x - DOCK_STAND_X, z - DOCK_STAND_Z) > DOCK_CLEAR) return { x, z };
  }
  return { x: 0, z: LAKE_CENTER_Z - 4 };
}

/** The jump under way at `time`, rings and all, if there is one. */
export function fishJumpAt(time: number, hour: LakeHour): FishJump | null {
  const gap = jumpGap(hour);
  const slot = Math.floor(time / gap);
  const start = slot * gap + hash(slot) * (gap - JUMP_SEC - JUMP_RING_SEC);
  const since = time - start;
  if (since < 0 || since > JUMP_SEC + JUMP_RING_SEC) return null;
  const spot = jumpSpot(slot);
  return { ...spot, yaw: hash(slot + 0.25) * Math.PI * 2, progress: since / JUMP_SEC, since };
}

/** The fish's height and nose pitch partway through the leap: up nose first, over, and back in. */
export function jumpArc(progress: number): { y: number; pitch: number } {
  const p = Math.min(1, Math.max(0, progress));
  return { y: Math.sin(p * Math.PI) * JUMP_HEIGHT - 0.1, pitch: (0.5 - p) * 2.2 };
}
