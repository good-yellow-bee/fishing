import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";

/** Caustic opacity for each unit of the hour's glint under a full sun. */
export const CAUSTIC_PER_GLINT = 0.22;
/** How much of the sun's own colour the net of light takes; the rest stays white. */
export const CAUSTIC_SUN_TINT = 0.55;
/** A lower sun throws a weaker net on the sand: full in summer, faint under the winter sun. */
export const CAUSTIC_SEASON: Record<LakeSeason, number> = { spring: 0.9, summer: 1, fall: 0.8, winter: 0.55 };

/**
 * The light a rippled surface throws on the shallows' sand. It needs the sun itself: under a lid of cloud,
 * rain or fog there is none, and what there is takes the sun's colour, warm at dawn and dusk.
 */
export function sunCaustics(look: { glint: number; sunOut: boolean }, sun: string, season: LakeSeason) {
  const opacity = look.sunOut ? look.glint * CAUSTIC_PER_GLINT * CAUSTIC_SEASON[season] : 0;
  const color = `#${new THREE.Color("#ffffff").lerp(new THREE.Color(sun), CAUSTIC_SUN_TINT).getHexString()}`;
  return { opacity, color };
}
