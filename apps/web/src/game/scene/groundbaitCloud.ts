import { LAKE_CENTER_Z, type SpotId } from "@stillwater/shared";
import { BANK_STANDS, PLACES } from "../hotspot";
import { GROUNDBAIT_CASTS } from "../logic";

/** How wide the cloud of groundbait spreads on the water, in metres. */
export const CLOUD_RADIUS = 1.1;

/** How far out from the stand, toward the middle of the lake, a handful is tossed. */
export const TOSS_M = 4;
/** And this far to the angler's right, so the angler's own back does not hide the cloud from the camera behind. */
export const TOSS_SIDE_M = 1.6;

/** Where a handful tossed from a bank lands: the open water nearest a short toss out toward the middle of the lake. */
export function cloudCenter(spot: SpotId): { x: number; z: number } {
  const stand = BANK_STANDS[spot];
  const out = Math.hypot(stand.x, LAKE_CENTER_Z - stand.z) || 1;
  const dx = -stand.x / out;
  const dz = (LAKE_CENTER_Z - stand.z) / out;
  const aim = { x: stand.x + dx * TOSS_M - dz * TOSS_SIDE_M, z: stand.z + dz * TOSS_M + dx * TOSS_SIDE_M };
  const away = (place: { x: number; z: number }) => Math.hypot(place.x - aim.x, place.z - aim.z);
  return PLACES[spot].reduce((best, place) => (away(place) < away(best) ? place : best));
}

/** The cloud thins as its casts are fished out: fullest just tossed, faint on the last cast. */
export function cloudOpacity(casts: number): number {
  return 0.1 + 0.3 * Math.max(0, Math.min(1, casts / GROUNDBAIT_CASTS));
}
