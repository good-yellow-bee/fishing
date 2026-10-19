import type { LakeSeason } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * An orchard on the hills behind the far bank, below the farm: two staggered rows of little fruit trees
 * that flower white and pink in spring, stand green in summer, turn gold and hang with red apples in the
 * fall, and stand bare in winter. Still, so laid out once.
 */

/** The orchard's west and east ends and its rows' heights on the hills' face: under the farm, west of the hay fields, above the railway. */
export const ORCHARD_WEST = -6.3;
export const ORCHARD_EAST = -3.5;
export const ROWS = [1.8, 2.45] as const;
/** Trees to a row. */
export const PER_ROW = 5;
/** A tree's height to the top of its crown, drawn a little larger than life so they read at the hills' distance. */
export const TREE_HEIGHT = 0.62;

export type OrchardTree = { x: number; y: number; z: number; size: number };

function hash(i: number) {
  const s = Math.sin(i * 91.7 + 47.3) * 43758.5453;
  return s - Math.floor(s);
}

/** Every tree in the orchard: the upper row set half a gap along from the lower, each a little different in size. */
export function orchardTrees(): OrchardTree[] {
  const gap = (ORCHARD_EAST - ORCHARD_WEST) / (PER_ROW - 0.5);
  const trees: OrchardTree[] = [];
  ROWS.forEach((y, row) => {
    for (let i = 0; i < PER_ROW; i += 1) {
      const x = ORCHARD_WEST + (i + row * 0.5) * gap;
      const size = 0.85 + hash(row * PER_ROW + i) * 0.3;
      // Below the hills' middles the face leans out, so a tree stands out in front of it as far up as its crown reaches.
      const face = Math.max(hillFront(x, y) ?? -30, hillFront(x, y + TREE_HEIGHT * size) ?? -30);
      trees.push({ x, y, z: face + 0.12, size });
    }
  });
  return trees;
}

export type OrchardLook = {
  /** The crown's colour, or null when the trees stand bare. */
  crown: string | null;
  /** Fruit or flowers dotted over the crown, or null. */
  dots: string | null;
};

/** How the orchard looks through the year. */
export function orchardLook(season: LakeSeason): OrchardLook {
  switch (season) {
    case "spring":
      return { crown: "#f4e3e6", dots: "#e7a3b8" };
    case "summer":
      return { crown: "#5f8f4a", dots: null };
    case "fall":
      return { crown: "#c99a40", dots: "#c0392b" };
    default:
      return { crown: null, dots: null };
  }
}
