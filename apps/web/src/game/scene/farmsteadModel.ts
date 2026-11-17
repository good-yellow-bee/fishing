import { hillFront } from "./farHills";

/**
 * A farmstead on the hills behind the far bank, beside the hay fields: a farmhouse and its barn.
 * Its windows light and its chimney smokes when the lakeside cabin's do (cabinLook.ts). Still, so laid out once.
 */

/** Where the farmhouse stands on the hills' face: its x and the height of its ground. */
export const FARM_AT = { x: -7.2, y: 3.3 };
/** The barn stands this far east of the house, its ground a little lower down the slope. */
export const BARN_OFFSET = { x: 1.3, y: -0.15 };
/** The farm is drawn at this scale, a little larger than life, so it reads from across the lake. */
export const FARM_SCALE = 1.1;
/** How tall the house stands to its ridge, before scaling: the hill's face is found up to here. */
const HEIGHT = 1.2;

/** The chimney's top on the farmhouse, from the house's ground, before scaling. */
export const CHIMNEY_TOP = { x: 0.3, y: 1.1, z: -0.1 };

/**
 * Where a building's front sits on the hills' face with its ground at `x`, `y`: below the hills'
 * middles the face leans out, so it stands out in front of the face as far up as its roof reaches.
 */
export function farmPoint(x: number, y: number) {
  const face = Math.max(hillFront(x, y) ?? -30, hillFront(x, y + HEIGHT * FARM_SCALE) ?? -30);
  return { x, y, z: face + 0.15 };
}
