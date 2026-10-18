import { SHOP_X, SHOP_Z, type LakeSeason } from "@stillwater/shared";

/** Where someone built a snowman by the shack: on the grass in front, toward the water, clear of the seat logs. */
export const SNOWMAN_AT = { x: SHOP_X + 0.9, z: SHOP_Z - 1.7 };
/** It looks back up at the shack. */
export const SNOWMAN_YAW = 0.2;

/** Snowballs from the bottom up: each one's radius and how high its middle sits, in metres. */
export const SNOWBALLS: readonly { r: number; y: number }[] = [
  { r: 0.36, y: 0.3 },
  { r: 0.26, y: 0.82 },
  { r: 0.18, y: 1.2 },
];

/** It stands all winter and is gone by spring. */
export function snowmanUp(season: LakeSeason) {
  return season === "winter";
}
