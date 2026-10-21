import { LAKE_CENTER_Z, type SpotId } from "@stillwater/shared";
import { BANK_STANDS, PLACES } from "../hotspot";
import { GROUNDBAIT_CASTS, SWIM_MAX_CASTS, TOPUP_MAX } from "../logic";

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

/** The cloud thins as its casts are fished out: faint on the last cast, full at a fresh handful's casts, and thicker still on a swim topped up past them. */
export function cloudOpacity(casts: number): number {
  const fresh = Math.max(0, Math.min(1, casts / GROUNDBAIT_CASTS));
  const topped = Math.max(0, Math.min(1, (casts - GROUNDBAIT_CASTS) / (SWIM_MAX_CASTS - GROUNDBAIT_CASTS)));
  return 0.1 + 0.3 * fresh + 0.15 * topped;
}

/** Feeders dimpling over a swim they have gathered at (GT442): rings at a time, each this long, and how far out over the cloud. */
export const DIMPLES = 4;
export const DIMPLE_SEC = 1.8;
const DIMPLE_REACH = 0.75;

/** Dimple `i` at `time` over a swim topped up `built` times: where over the cloud's middle it rings and how far through its spread (0..1). Pure. */
export function dimpleAt(i: number, time: number, built = 0): { dx: number; dz: number; age: number } {
  // Each ring has its own cycle length, so they never fall into step; a built swim's feeders ring again sooner.
  const cycle = DIMPLE_SEC + (0.7 + i * 0.53) * (1 - 0.35 * Math.min(built, TOPUP_MAX));
  const round = Math.floor((time + i * 1.17) / cycle);
  const age = ((time + i * 1.17) % cycle) / DIMPLE_SEC;
  const turn = Math.sin((round + 1) * 12.9898 + i * 78.233) * 43758.5453;
  const angle = (turn - Math.floor(turn)) * Math.PI * 2;
  const out = DIMPLE_REACH * Math.sqrt(Math.abs(Math.cos(turn)));
  return { dx: Math.cos(angle) * out, dz: Math.sin(angle) * out, age };
}
