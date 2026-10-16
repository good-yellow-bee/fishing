import { localDate } from "@stillwater/shared";
import { sunTimes } from "./sunTimes";

/** How far from sunrise or sunset, in minutes, a fish still counts as caught "around" it. */
export const NEAR_SUN = 120;

/**
 * Where a fish's time sat against the sun at its water: minutes from the nearer sunrise or sunset when within
 * NEAR_SUN (negative before it), else just whether it was daylight or dark. Null where the sun never rose or set.
 */
export type SunMark = { edge: "rise" | "set"; minutes: number } | { edge: null; light: "day" | "dark" };

export function sunMark(caughtAt: string, place: { lat: number; lng: number }): SunMark | null {
  const at = new Date(caughtAt);
  if (Number.isNaN(at.getTime())) return null;
  const sun = sunTimes(localDate(at), place.lat, place.lng);
  if (!("rise" in sun)) return null;
  const toRise = (at.getTime() - sun.rise.getTime()) / 60000;
  const toSet = (at.getTime() - sun.set.getTime()) / 60000;
  const [edge, minutes] = Math.abs(toRise) <= Math.abs(toSet) ? (["rise", toRise] as const) : (["set", toSet] as const);
  if (Math.abs(minutes) <= NEAR_SUN) return { edge, minutes: Math.round(minutes) };
  return { edge: null, light: toRise > 0 && toSet < 0 ? "day" : "dark" };
}

/** Of one water's fish, how many came within an hour of sunrise or sunset, out of those the sun can be placed for. */
export function nearSunCount(catches: readonly { caughtAt: string }[], place: { lat: number; lng: number }): { near: number; total: number } {
  let near = 0;
  let total = 0;
  for (const entry of catches) {
    const mark = sunMark(entry.caughtAt, place);
    if (!mark) continue;
    total += 1;
    if (mark.edge && Math.abs(mark.minutes) <= 60) near += 1;
  }
  return { near, total };
}
