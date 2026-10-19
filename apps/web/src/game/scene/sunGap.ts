import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type Sky } from "@stillwater/shared";
import { CLOUD_DRIFT, CLOUD_WIND } from "./cloudShadow";

/**
 * Sun breaks: on grey, overcast days a gap now and then opens in the cloud, and a patch of sunlight
 * slides across the lake with the wind that drives the cloud, the water brightening under it and
 * faint beams slanting down to it through the damp air, until the gap closes over. Pure in time.
 */

/** Under a lid of grey cloud by day. */
export function sunBreakOut(hour: LakeHour, sky: Sky | undefined) {
  return hour === "day" && sky === "overcast";
}

/** A gap opens this often, and its light takes CROSS_SEC to slide across the lake. */
export const BREAK_EVERY_SEC = 46;
export const CROSS_SEC = 36;
/** The first comes this long in. */
const FIRST_SEC = 6;
/** Where the light passes nearest: out over the far half of the lake, so the beams stand off beyond the dock; how far either side of there it passes, and how far it runs. */
const MIDDLE_Z = LAKE_CENTER_Z - 3;
const OFFSET = 4;
/** The gap has closed by the time it drifts this far toward the dock. */
const NEAR_Z = -2;
const RUN = 17;
/** The sunlit patch's radius, and how long it takes to open and close. */
export const PATCH_RADIUS = 5.5;
const OPEN_SEC = 6;

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/** Which way the cloud carries the gap across the water: downwind, and east when the air is still (as the cloud shadows drift). */
export function breakDrift(wind: { x: number; z: number }) {
  const x = CLOUD_DRIFT + wind.x * CLOUD_WIND;
  const z = wind.z * CLOUD_WIND;
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

export type SunBreak = { x: number; z: number; radius: number; strength: number };

/** The sunlit patch at `time`: where its middle is on the water, how wide, and how bright, 0 to 1; null between gaps. `still` holds one over the lake's middle. */
export function sunBreakAt(time: number, wind: { x: number; z: number }, still = false): SunBreak | null {
  if (still) return { x: 0, z: MIDDLE_Z, radius: PATCH_RADIUS, strength: 0.8 };
  const shifted = time - FIRST_SEC;
  const index = Math.floor(shifted / BREAK_EVERY_SEC);
  const since = shifted - index * BREAK_EVERY_SEC;
  if (since < 0 || since >= CROSS_SEC) return null;
  const drift = breakDrift(wind);
  const across = (hash(index) * 2 - 1) * OFFSET;
  const along = -RUN + (2 * RUN * since) / CROSS_SEC;
  const x = drift.x * along - drift.z * across;
  const z = MIDDLE_Z + drift.z * along + drift.x * across;
  // Carried toward the near shore on a wind blowing in, the gap closes over before it reaches the dock.
  const near = smooth((NEAR_Z - z) / 4);
  // Its light shows on the water: off over the banks it fades from view.
  const out = Math.hypot(x / LAKE_RX, (z - LAKE_CENTER_Z) / LAKE_RZ);
  const water = smooth((1.05 - out) / 0.3);
  const strength = smooth(since / OPEN_SEC) * smooth((CROSS_SEC - since) / OPEN_SEC) * near * water * (0.7 + 0.3 * hash(index + 7));
  return { x, z, radius: PATCH_RADIUS * (0.8 + 0.4 * hash(index + 3)), strength };
}

/** Beam `i` of BEAMS's foot within the patch, as offsets from its middle in shares of its radius. */
export const BEAMS = 4;
export function beamFoot(i: number) {
  const a = i * 2.4 + 0.6;
  const r = 0.25 + 0.5 * hash(i + 11);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, width: 0.9 + 0.8 * hash(i + 17) };
}
