import { inLake, spotAt, type SpotId } from "@stillwater/shared";

export const HOTSPOT_PERIOD_MS = 3 * 60 * 1000;
export const HOTSPOT_RADIUS = 2.1;

export type Hotspot = { x: number; z: number; spot: SpotId; startsAt: number };

type Candidate = Omit<Hotspot, "startsAt">;

function hash(value: number) {
  let n = value | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

const candidates: Candidate[] = [];
for (let x = -20; x <= 20; x += 1) {
  for (let z = -14; z <= 14; z += 1) {
    const spot = inLake(x, z) ? spotAt(x, z) : null;
    if (spot) candidates.push({ x, z, spot });
  }
}

/** One safe water patch per period. The selected bank changes with the period. */
export function hotspotAt(nowMs: number): Hotspot {
  const startsAt = Math.floor(nowMs / HOTSPOT_PERIOD_MS) * HOTSPOT_PERIOD_MS;
  const index = hash(Math.floor(startsAt / HOTSPOT_PERIOD_MS)) % candidates.length;
  return { ...candidates[index]!, startsAt };
}

export function isHotspotCast(hotspot: Hotspot, x: number, z: number, spot: SpotId) {
  return hotspot.spot === spot && Math.hypot(hotspot.x - x, hotspot.z - z) <= HOTSPOT_RADIUS;
}
