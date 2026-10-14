import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { DOCK_STAND_Z, inLake } from "@stillwater/shared";

/** Striders skating the still water just off the dock's left side; Lite effects keep the first half. */
export const STRIDER_COUNT = 6;
export const STRIDER_PATCH = { x: -1.9, z: DOCK_STAND_Z - 2.6, r: 1.4 } as const;
/** The fastest drift (as WIND_DRIFT gives it) they still skate in. */
export const STRIDER_MAX_WIND = 0.05;
/** A dart's length in metres and seconds; rests between darts run this long. */
export const DART_M = 0.35;
export const DART_SEC = 0.18;
export const REST_MIN = 0.5;
export const REST_MAX = 1.8;

/** On calm, dry water by daylight, outside winter. */
export function stridersOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, windSpeed: number): boolean {
  return season !== "winter" && hour !== "night" && sky !== "rain" && windSpeed <= STRIDER_MAX_WIND;
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export type StriderPose = { x: number; z: number; yaw: number; darting: boolean };

/**
 * Where strider `i` rests between dart `k - 1` and dart `k`: a slow seeded
 * wander round the patch, so each dart is a short hop from the last spot.
 */
function spot(i: number, k: number) {
  const step = DART_M / (STRIDER_PATCH.r * 0.8);
  const a = k * step * (0.8 + unit(i + 1) * 0.4) + unit(i + 2) * 6.28;
  const b = k * step * (0.6 + unit(i + 3) * 0.4) + unit(i + 4) * 6.28;
  const reach = STRIDER_PATCH.r * 0.8;
  return { x: STRIDER_PATCH.x + Math.sin(a) * reach * 0.8 + Math.sin(k * 2.1 + i) * 0.06, z: STRIDER_PATCH.z + Math.cos(b) * reach * 0.8 + Math.cos(k * 1.7 + i) * 0.06 };
}

/**
 * Strider `i` at `time`: it rests at one spot, then darts in a quick dash to
 * the next, once a beat (its own seeded length). `still` holds it at one
 * spot, for reduced motion.
 */
export function striderAt(i: number, time: number, still = false): StriderPose {
  if (still) return { ...spot(i, 0), yaw: unit(i + 0.25) * Math.PI * 2, darting: false };
  const beat = REST_MIN + unit(i * 5) * (REST_MAX - REST_MIN) + DART_SEC;
  const shifted = time + unit(i + 9) * beat;
  const k = Math.floor(shifted / beat);
  const into = shifted - k * beat;
  const from = spot(i, k);
  const to = spot(i, k + 1);
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  const rest = beat - DART_SEC;
  if (into < rest) return { ...from, yaw, darting: false };
  const u = (into - rest) / DART_SEC;
  const e = 1 - (1 - u) * (1 - u);
  return { x: from.x + (to.x - from.x) * e, z: from.z + (to.z - from.z) * e, yaw, darting: true };
}

/** Whether a spot is open water: the patch must stay on the lake. */
export function patchOnWater() {
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (!inLake(STRIDER_PATCH.x + Math.cos(a) * STRIDER_PATCH.r, STRIDER_PATCH.z + Math.sin(a) * STRIDER_PATCH.r)) return false;
  }
  return true;
}
