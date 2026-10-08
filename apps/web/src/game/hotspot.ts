import {
  canUseSpot,
  DOCK_STAND_X,
  DOCK_STAND_Z,
  inCastRange,
  LAKE_CENTER_Z,
  LAKE_RX,
  LAKE_RZ,
  POINT_PAD,
  SPOT_IDS,
  spotAt,
  walkableAt,
  type SpotId,
} from "@stillwater/shared";
import { DROPOFF_STAND, REEDS_STAND } from "./scene/bankWalk";

export const HOTSPOT_PERIOD_MS = 3 * 60 * 1000;
export const HOTSPOT_RADIUS = 1.5;

export type Hotspot = { x: number; z: number; spot: SpotId; startsAt: number };

/** Where the angler stands to fish each bank: the pier, the pale bank boards, and the point's dry pad. */
export const BANK_STANDS: Record<SpotId, { x: number; z: number }> = {
  dock: { x: DOCK_STAND_X, z: DOCK_STAND_Z },
  reeds: REEDS_STAND,
  dropoff: DROPOFF_STAND,
  point: { x: POINT_PAD.x, z: POINT_PAD.z },
};

const STEP = 0.5;

/** Open water on that bank a cast from its stand reaches, clear of the pier and the path boards. */
function placesOn(spot: SpotId) {
  const stand = BANK_STANDS[spot];
  const places: { x: number; z: number }[] = [];
  // Whole and half meters, so the drop-off's half-meter band of reachable water still gets rows.
  for (let x = -Math.ceil(LAKE_RX); x <= LAKE_RX; x += STEP) {
    for (let z = Math.floor(LAKE_CENTER_Z - LAKE_RZ); z <= LAKE_CENTER_Z + LAKE_RZ; z += STEP) {
      if (spotAt(x, z) === spot && !walkableAt(x, z) && inCastRange(stand.x, stand.z, x, z)) places.push({ x, z });
    }
  }
  if (places.length === 0) throw new Error(`No water in reach of the ${spot} stand`);
  return places;
}

const PLACES = Object.fromEntries(SPOT_IDS.map((spot) => [spot, placesOn(spot)])) as Record<SpotId, { x: number; z: number }[]>;

function mix(value: number) {
  let n = value | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

/** One bubble patch per wall-clock period, on the next bank this angler can fish, so it never stays two periods on one bank. */
export function hotspotAt(nowMs: number, level: number): Hotspot {
  const period = Math.floor(nowMs / HOTSPOT_PERIOD_MS);
  const banks = SPOT_IDS.filter((spot) => canUseSpot(spot, level));
  const spot = banks[period % banks.length]!;
  const places = PLACES[spot];
  return { ...places[mix(period) % places.length]!, spot, startsAt: period * HOTSPOT_PERIOD_MS };
}

export function isHotspotCast(hotspot: Hotspot | null, x: number, z: number, spot: SpotId) {
  return hotspot !== null && hotspot.spot === spot && Math.hypot(hotspot.x - x, hotspot.z - z) <= HOTSPOT_RADIUS;
}
