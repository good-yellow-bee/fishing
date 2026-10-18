import type { LakeSeason } from "@stillwater/shared";
import { lilyPads } from "./scene/lilyBloom";

/** The lily pads on the water, three beds of a large and a small pad each; LakeWorld draws them here. */
export const LILY_PADS_AT = [
  { x: -8.4, z: 5.5, large: true, scale: 1.35 },
  { x: -6.8, z: 4.8, large: false, scale: 1.5 },
  { x: 7.8, z: -8.4, large: true, scale: 1.2 },
  { x: 9.1, z: -7.7, large: false, scale: 1.4 },
  { x: -12.2, z: -4.1, large: false, scale: 1.2 },
  { x: -10.6, z: -6.8, large: true, scale: 1.15 },
] as const;

/** A cast landing this close to a pad's middle, in meters, is tight to the bed. */
export const LILY_COVER_REACH = 1.6;
/** Bass and pike lie in ambush under the pads, so a cast tight to them bites this much sooner. */
export const LILY_COVER_WAIT = 0.85;
/** Share of casts tight to the pads that foul the lure on the pad stems; a topwater rides over them. */
export const LILY_SNAG_ODDS = 0.25;

/** Whether a cast landing at (x, z) is tight to a lily pad bed; the pads die back in winter. */
export function tightToPads(season: LakeSeason | undefined, x: number, z: number) {
  if (!season || !lilyPads(season)) return false;
  return LILY_PADS_AT.some((pad) => Math.hypot(pad.x - x, pad.z - z) <= LILY_COVER_REACH);
}
