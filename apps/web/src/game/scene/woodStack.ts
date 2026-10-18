import { SHOP_X, SHOP_Z, type LakeSeason } from "@stillwater/shared";

/**
 * The campfire's woodpile: split logs stacked between two stakes west of the fire, a chopping
 * block beside it with the axe left in it, and snow on top of it all in winter. The pile runs
 * down through the year as the wood is burned, and is stacked high again by fall.
 */

/** Where the pile stands, west of the campfire, its cut log ends toward the shack. */
export const WOODPILE_AT = { x: SHOP_X - 3.3, z: SHOP_Z - 0.4 };
/** The chopping block, beside the pile on the side away from the fire. */
export const BLOCK_AT = { x: SHOP_X - 4.05, z: SHOP_Z - 0.85 };
/** How long each log is, and its radius. */
export const LOG_LENGTH = 0.55;
export const LOG_R = 0.075;
/** Logs across the bottom row; each row up holds one fewer. */
const BOTTOM_ROW = 5;

/** How many rows of logs are stacked, by season: full for winter, burned down by summer. */
const ROWS: Record<LakeSeason, number> = { fall: 4, winter: 3, spring: 2, summer: 2 };

export type LogEnd = { x: number; y: number };

/** Each log's place across the face of the pile (x across, y up), stacked in the hollows of the row below. */
export function woodpileLogs(season: LakeSeason): LogEnd[] {
  const logs: LogEnd[] = [];
  const rise = LOG_R * Math.sqrt(3);
  for (let row = 0; row < ROWS[season]; row += 1) {
    const count = BOTTOM_ROW - row;
    for (let k = 0; k < count; k += 1) {
      logs.push({ x: (k - (count - 1) / 2) * LOG_R * 2, y: LOG_R + row * rise });
    }
  }
  return logs;
}

/** Snow lies on the pile and the block all winter. */
export function woodpileSnowy(season: LakeSeason) {
  return season === "winter";
}
