import type { LakeSeason } from "@stillwater/shared";
import { FIELDS } from "./hayField";

/**
 * A rapeseed field: in spring, before the hay is cut, the field under the windmill on the hills behind
 * the far bank flowers bright yellow, in close drill rows along the slope. Still, so laid out once.
 */

/** In flower through the spring. */
export function rapeseedOut(season: LakeSeason) {
  return season === "spring";
}

/** Which of the hay fields flowers: the one under the windmill, clear of the sheep's field. */
export const RAPESEED_FIELD = 1;
/** The flowers' two yellows, alternating row by row. */
export const RAPESEED_ROWS = ["#ffe94a", "#f5d532"] as const;
/** How many drill rows run along the slope. */
export const ROW_COUNT = 8;

/** The field's span by x and height, for keeping other things off it. */
export function rapeseedSpan() {
  const field = FIELDS[RAPESEED_FIELD];
  return { left: field.x - field.halfX, right: field.x + field.halfX, bottom: field.y - field.halfY, top: field.y + field.halfY };
}
