import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Bonfire: on fall evenings and nights a bonfire burns on the hills behind the far bank, between the
 * two hay fields, flickering against the dark slope with its smoke leaning away on the wind. Still,
 * so laid out once; the fire itself is the shack's campfire drawn larger (Campfire.tsx).
 */

/** Lit on fall evenings and nights, unless it is raining or foggy. */
export function bonfireOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season === "fall" && (hour === "dusk" || hour === "night") && sky !== "rain" && sky !== "fog";
}

/** Where the bonfire burns on the hills' face: between the fields, its x and the height of its ground. */
export const BONFIRE_AT = { x: 4.3, y: 2.95 };
/** The fire is drawn at this scale of the shack's campfire, a bonfire rather than a cooking fire. */
export const BONFIRE_SCALE = 1.8;
/** How tall its flames reach, before scaling: the hills' face is found up to here. */
const HEIGHT = 0.4;

/** The fire's ground: out in front of the hills' face as far up as its flames, and its stone ring's width. */
export function bonfirePoint() {
  const { x, y } = BONFIRE_AT;
  const face = Math.max(hillFront(x, y) ?? -30, hillFront(x, y + HEIGHT * BONFIRE_SCALE) ?? -30);
  return { x, y, z: face + 0.45 * BONFIRE_SCALE };
}
