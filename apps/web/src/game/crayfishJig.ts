import type { LakeSeason } from "@stillwater/shared";
import { CRAYFISH_HOMES, crayfishOut } from "./scene/crayfishCrawl";

/** How near a crayfish's home among the dock's pilings, in metres, a jig must land to crawl over the bed. */
export const CRAYFISH_REACH = 0.8;
/** A jig hopped over the crayfish bed looks like one of them, so the fish that hunt them bite this much sooner. */
export const CRAYFISH_JIG_WAIT = 0.85;

/** Whether a lure landing at (x, z) lands on the crayfish bed round the dock's pilings; they sit out the winter under the stones. */
export function onCrayfishBed(season: LakeSeason | undefined, x: number, z: number) {
  if (!season || !crayfishOut(season)) return false;
  return CRAYFISH_HOMES.some((home) => Math.hypot(home.x - x, home.z - z) <= CRAYFISH_REACH);
}
