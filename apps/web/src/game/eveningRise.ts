import type { LakeHour, LakeSeason, Sky, SpotId, Wind } from "@stillwater/shared";
import { PLACES } from "./hotspot";

/** A new rise dimples the water this often, somewhere in reach of the bank. */
export const RISE_EVERY_MS = 2200;
/** How long a rise stays fresh enough to cast to. */
export const RISE_FRESH_MS = 6000;
/** A cast this close to a fresh rise counts as on it. */
export const RISE_RADIUS = 1.3;

export type Rise = { x: number; z: number; bornAt: number };

/** Calm or light-wind dusks in spring and summer, dry: the evening rise. */
export function eveningRiseOn(hour: LakeHour, season: LakeSeason, sky: Sky, wind: Wind) {
  const warm = season === "spring" || season === "summer";
  const still = wind === "calm" || wind.startsWith("light");
  return hour === "dusk" && warm && sky !== "rain" && still;
}

function mix(value: number) {
  let n = value | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

const SPOT_SALT: Record<SpotId, number> = { dock: 1, reeds: 2, dropoff: 3, point: 4, inlet: 5, open: 6 };

/** The rises still fresh at `nowMs` in reach of `spot`, oldest first; the same for every angler at that moment. */
export function risesAt(spot: SpotId, nowMs: number): Rise[] {
  const places = PLACES[spot];
  const last = Math.floor(nowMs / RISE_EVERY_MS);
  const rises: Rise[] = [];
  for (let slot = last - Math.ceil(RISE_FRESH_MS / RISE_EVERY_MS); slot <= last; slot += 1) {
    const seed = mix(slot * 97 + SPOT_SALT[spot]);
    const bornAt = slot * RISE_EVERY_MS + (seed % 1000) / 1000 * RISE_EVERY_MS * 0.6;
    const age = nowMs - bornAt;
    if (age < 0 || age >= RISE_FRESH_MS) continue;
    rises.push({ ...places[mix(seed) % places.length]!, bornAt });
  }
  return rises;
}

/** Whether a cast landing at (x, z) from `spot` at `nowMs` falls on a fresh rise. */
export function isRiseCast(spot: SpotId, x: number, z: number, nowMs: number) {
  return risesAt(spot, nowMs).some((rise) => Math.hypot(rise.x - x, rise.z - z) <= RISE_RADIUS);
}
