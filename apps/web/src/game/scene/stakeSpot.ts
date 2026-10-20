import { DOCK_PLANKS, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, POINT_PAD, lakeEdge, type SpotId } from "@stillwater/shared";
import { DROPOFF_STAND, INLET_STAND, REEDS_STAND } from "./bankWalk";

/**
 * Where a night line (GT423) is staked while it is out: on the dock, at the deck's west edge, leaning out over the
 * water; at a bank, at the waterline a step along from where the angler stands, leaning out toward the lake's middle.
 * Still.
 */

const STANDS: Partial<Record<SpotId, { x: number; z: number }>> = { point: POINT_PAD, reeds: REEDS_STAND, dropoff: DROPOFF_STAND, inlet: INLET_STAND };
/** A step along the shore from the stand, clear of the walk boards; mostly the other way round from the crowded bank's chair (rivalSeat.ts), though at the inlet the boards leave only its side, where the chair sits further back. */
const ALONG: Partial<Record<SpotId, number>> = { point: 1.0, reeds: 1.0, dropoff: -1.0, inlet: -1.0 };
/** Just inland of the waterline, so the stick stands on the bank. */
const BACK = 0.12;

export type Stake = { x: number; y: number; z: number; yaw: number };

/** The night line's stake at `bank`, or null for open water. */
export function stakeAt(bank: SpotId): Stake | null {
  if (bank === "dock") return { x: DOCK_PLANKS.minX + 0.08, y: DOCK_PLANKS.top, z: (DOCK_PLANKS.minZ + DOCK_PLANKS.maxZ) / 2 - 0.4, yaw: -Math.PI / 2 };
  const stand = STANDS[bank];
  if (!stand) return null;
  const home = Math.atan2(-(stand.z - LAKE_CENTER_Z) / LAKE_RZ, stand.x / LAKE_RX);
  const radius = Math.hypot(LAKE_RX * Math.cos(home), LAKE_RZ * Math.sin(home));
  const angle = home + (ALONG[bank] ?? 0) / radius;
  const edge = lakeEdge(angle);
  const x = Math.cos(angle) * (LAKE_RX * edge + BACK);
  const z = LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + BACK);
  // Unturned it leans out along +z; turn it to lean toward the lake's middle.
  return { x, y: 0, z, yaw: Math.atan2(-x, LAKE_CENTER_Z - z) };
}
