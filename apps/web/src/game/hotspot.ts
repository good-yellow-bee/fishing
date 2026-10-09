import {
  CAST_RANGE,
  canUseSpot,
  DOCK_STAND_X,
  DOCK_STAND_Z,
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

/** Where a cast at each bank is measured from: the pier, the pale reeds boards, the drop-off's dry waterline and the point's pad. */
export const BANK_STANDS: Record<SpotId, { x: number; z: number }> = {
  dock: { x: DOCK_STAND_X, z: DOCK_STAND_Z },
  reeds: REEDS_STAND,
  // The pale drop-off board reaches only a 0.6 m band of deep water, too thin for a patch, so measure from the water's edge in front of it.
  dropoff: { x: DROPOFF_STAND.x, z: 6.7 },
  point: { x: POINT_PAD.x, z: POINT_PAD.z },
};

const STEP = 0.5;

/** At least half the patch is that bank's open water, so it reads as a patch and not a sliver along an edge. */
function mostlyOpen(spot: SpotId, x: number, z: number) {
  let disc = 0;
  let open = 0;
  for (let dx = -HOTSPOT_RADIUS; dx <= HOTSPOT_RADIUS; dx += STEP) {
    for (let dz = -HOTSPOT_RADIUS; dz <= HOTSPOT_RADIUS; dz += STEP) {
      if (Math.hypot(dx, dz) > HOTSPOT_RADIUS) continue;
      disc += 1;
      if (spotAt(x + dx, z + dz) === spot && !walkableAt(x + dx, z + dz)) open += 1;
    }
  }
  return open * 2 >= disc;
}

/** Centers on that bank's open water, clear of the pier and the path boards, with the whole patch in reach of the stand. */
function placesOn(spot: SpotId) {
  const stand = BANK_STANDS[spot];
  const places: { x: number; z: number }[] = [];
  for (let x = -Math.ceil(LAKE_RX); x <= LAKE_RX; x += STEP) {
    for (let z = Math.floor(LAKE_CENTER_Z - LAKE_RZ); z <= LAKE_CENTER_Z + LAKE_RZ; z += STEP) {
      const inReach = Math.hypot(x - stand.x, z - stand.z) + HOTSPOT_RADIUS <= CAST_RANGE;
      if (inReach && spotAt(x, z) === spot && !walkableAt(x, z) && mostlyOpen(spot, x, z)) places.push({ x, z });
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

/** Each bank three times in twelve periods, never twice running. */
const ROTATION: readonly SpotId[] = ["dock", "reeds", "dropoff", "point", "reeds", "point", "dropoff", "dock", "point", "dock", "dropoff", "reeds"];
// Before the drop-off opens, its turn goes to the bank on neither side, so a level-up never repeats a bank and only moves the bubbles onto the drop-off.
const ROTATION_WITHOUT_DROPOFF = ROTATION.map((spot, i) => {
  if (spot !== "dropoff") return spot;
  const [before, after] = [ROTATION.at(i - 1), ROTATION[(i + 1) % ROTATION.length]];
  return SPOT_IDS.find((other) => other !== "dropoff" && other !== before && other !== after)!;
});

/** One bubble patch per wall-clock period, on a bank this angler can fish, never the same bank two periods running. */
export function hotspotAt(nowMs: number, level: number): Hotspot {
  const period = Math.floor(nowMs / HOTSPOT_PERIOD_MS);
  const rotation = canUseSpot("dropoff", level) ? ROTATION : ROTATION_WITHOUT_DROPOFF;
  const spot = rotation[period % rotation.length]!;
  const places = PLACES[spot];
  return { ...places[mix(period) % places.length]!, spot, startsAt: period * HOTSPOT_PERIOD_MS };
}

export function isHotspotCast(hotspot: Hotspot | null, x: number, z: number, spot: SpotId) {
  return hotspot !== null && hotspot.spot === spot && Math.hypot(hotspot.x - x, hotspot.z - z) <= HOTSPOT_RADIUS;
}
