import type { LakeSeason } from "@stillwater/shared";
import { DOCK_PLANKS } from "@stillwater/shared";

/** How much darker soaked wood reads than dry. */
export const WET_SHADE = 0.55;
/** Raindrops splashing on the planks at once, and how long each splash lasts. */
export const DOCK_DROPS = 10;
export const DROP_SEC = 0.35;

/** Planks soak in rain; snow falls dry. */
export function dockWet(rain: boolean, season: LakeSeason) {
  return rain && season !== "winter";
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export type DockDrop = { x: number; z: number; age: number };

/**
 * Drop `i` at time `t`: each lands at a fresh spot on the planks every cycle,
 * staggered so the splashes never all land together. `age` runs 0..1 through
 * the splash, or is -1 between splashes.
 */
export function dockDrop(i: number, t: number): DockDrop {
  const period = 0.9 + unit(i + 1) * 0.8;
  const shifted = t / period + unit(i + 7);
  const cycle = Math.floor(shifted);
  const age = ((shifted - cycle) * period) / DROP_SEC;
  const seed = i * 97 + cycle * 13;
  return {
    x: DOCK_PLANKS.minX + 0.1 + unit(seed) * (DOCK_PLANKS.maxX - DOCK_PLANKS.minX - 0.2),
    z: DOCK_PLANKS.minZ + 0.1 + unit(seed + 3) * (DOCK_PLANKS.maxZ - DOCK_PLANKS.minZ - 0.2),
    age: age <= 1 ? age : -1,
  };
}
