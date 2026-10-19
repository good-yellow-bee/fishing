import type { LakeSeason, Sky } from "@stillwater/shared";

/** Seconds of snowfall to build a full cap, and to melt it once the snow stops. */
export const CAP_BUILD_SEC = 45;
export const CAP_MELT_SEC = 12;

/** Snow falls when it precipitates in winter. */
export function snowing(sky: Sky | undefined, season: LakeSeason) {
  return sky === "rain" && season === "winter";
}

/** Settled snow, 0 bare to 1 full, after `delta` seconds more of snowing (or not), filling over `buildSec`. */
export function capSnow(prev: number, delta: number, falling: boolean, buildSec = CAP_BUILD_SEC) {
  const next = falling ? prev + delta / buildSec : prev - delta / CAP_MELT_SEC;
  return Math.min(1, Math.max(0, next));
}
