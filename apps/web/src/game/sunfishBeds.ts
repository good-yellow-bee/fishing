import type { LakeSeason } from "@stillwater/shared";
import { nestsOut, sunfishNests, type Nest } from "./scene/sunfishNests";

/** How far past a nest's rim, in metres, a lure can land and still be on the bed. */
export const BED_REACH = 0.4;
/** Perch and smallmouth come to raid the sunfish eggs, so a cast onto the beds bites this much sooner. */
export const SUNFISH_BED_WAIT = 0.85;

let nests: readonly Nest[] | null = null;

/** Whether a lure landing at (x, z) lands on the sunfish nests either side of the dock; the beds are fanned only in spring and summer. */
export function onSunfishBed(season: LakeSeason | undefined, x: number, z: number) {
  if (!season || !nestsOut(season)) return false;
  nests ??= sunfishNests();
  return nests.some((nest) => Math.hypot(nest.x - x, nest.z - z) <= nest.radius + BED_REACH);
}
