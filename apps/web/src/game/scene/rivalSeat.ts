import { DOCK_STAND_X, DOCK_STAND_Z, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, POINT_PAD, lakeEdge, type LakeHour, type SpotId } from "@stillwater/shared";
import { DROPOFF_STAND, INLET_STAND, REEDS_STAND } from "./bankWalk";

/**
 * The other angler who fishes one bank each day (crowdedBankForDay): sat on a camp chair at the water's edge a
 * little way along the shore from where the player stands there, rod out over the water, from dawn to dusk.
 * Still, so worked out once.
 */

/** Where the player fishes each bank from. */
const STANDS: Partial<Record<SpotId, { x: number; z: number }>> = {
  dock: { x: DOCK_STAND_X, z: DOCK_STAND_Z },
  point: POINT_PAD,
  reeds: REEDS_STAND,
  dropoff: DROPOFF_STAND,
  inlet: INLET_STAND,
};
/**
 * How far along the shore from the stand the chair sits (signed: which way round, as the shore rings run) and how
 * far back from the waterline; each picked so the camera at that bank sees the chair beside the angler, clear of the
 * walk boards.
 */
const ALONG: Partial<Record<SpotId, number>> = { dock: 2.6, point: -2.0, reeds: -2.6, dropoff: 2.6, inlet: -2.6 };
const BACK: Partial<Record<SpotId, number>> = { inlet: 1.5 };

export type RivalSeat = { x: number; z: number; yaw: number };

/** Out from dawn to dusk; at night the bank is the angler's own. */
export function rivalOut(hour: LakeHour) {
  return hour !== "night";
}

/** The shore point at `angle` round the lake (as the shore rings are laid: the shape's +y is the world's -z), `back` metres inland. */
function shoreAt(angle: number, back: number) {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + back), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + back) };
}

/** The other angler's seat at `bank`, facing the middle of the lake, or null for a bank no one else fishes. */
export function rivalSeat(bank: SpotId): RivalSeat | null {
  const stand = STANDS[bank];
  if (!stand) return null;
  const home = Math.atan2(-(stand.z - LAKE_CENTER_Z) / LAKE_RZ, stand.x / LAKE_RX);
  const radius = Math.hypot(LAKE_RX * Math.cos(home), LAKE_RZ * Math.sin(home));
  const { x, z } = shoreAt(home + (ALONG[bank] ?? 0) / radius, BACK[bank] ?? 0.45);
  // A figure faces +z unturned; turn it to face the lake's middle.
  return { x, z, yaw: Math.atan2(-x, LAKE_CENTER_Z - z) };
}
