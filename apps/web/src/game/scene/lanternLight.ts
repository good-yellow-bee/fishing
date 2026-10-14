import { SHOP_X, SHOP_Z, type LakeHour } from "@stillwater/shared";
import { BANK_POSTS } from "./bankWalk";

/**
 * Warm lanterns after dark: two on the dock's lake-end posts and one by the shack, which cast real light,
 * and a small one on each bank post that only glows, so the lit pools stay cheap.
 */

export type Lantern = { x: number; y: number; z: number; seed: number; casts: boolean };

export const LANTERN_COLOR = "#ffb35c";
/** Where the dock and shack lanterns throw their light, and how far it carries. */
export const LANTERN_LIGHTS: readonly { x: number; y: number; z: number }[] = [
  { x: 0, y: 1.15, z: 5.7 },
  { x: SHOP_X + 0.9, y: 1.5, z: SHOP_Z + 0.9 },
];
export const LANTERN_REACH = 6;

export const LANTERNS: readonly Lantern[] = [
  { x: -0.72, y: 0.8, z: 5.56, seed: 1, casts: true },
  { x: 0.72, y: 0.8, z: 5.56, seed: 2, casts: true },
  { x: SHOP_X + 0.9, y: 1.4, z: SHOP_Z + 0.9, seed: 3, casts: true },
  ...BANK_POSTS.map((post, i) => ({ x: post.x, y: 1.16, z: post.z, seed: 4 + i, casts: false })),
];

/** How bright the lanterns burn this hour: off by day and at dawn, half at dusk, full at night. */
export function lanternLevel(hour: LakeHour) {
  if (hour === "night") return 1;
  if (hour === "dusk") return 0.6;
  return 0;
}

/** A candle's waver, between about 0.76 and 1. `still` holds it steady for reduced motion. */
export function lanternFlicker(time: number, seed: number, still = false) {
  if (still) return 1;
  return 0.88 + 0.08 * Math.sin(time * 7.3 + seed * 1.7) + 0.04 * Math.sin(time * 13.1 + seed * 3.1);
}
