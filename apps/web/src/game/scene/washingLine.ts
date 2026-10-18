import { SHOP_X, SHOP_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A washing line strung between two posts on the grass in front of the shack. On a dry day from
 * spring to fall the washing is pegged out on it and blows out on the day's wind. Pure in time.
 */

/** The two posts, on the sandy rim of the bank in front of the shack, between the door and the big tree; the line runs along x. */
export const LINE_FROM = { x: SHOP_X + 0.3, z: SHOP_Z - 2.4 };
export const LINE_TO = { x: SHOP_X + 2.1, z: SHOP_Z - 2.4 };
/** How high the line is tied at the posts, and how far it sags in the middle. */
export const LINE_Y = 1.55;
export const LINE_SAG = 0.12;
/** The drift (m/s) at which the washing stands out nearly level, as the windsock's does. */
const FULL_WIND = 0.13;
/** How far a garment can blow out from hanging straight down, in radians. */
const MAX_LEAN = 1.15;

export type Garment = { kind: "shirt" | "towel" | "sock"; at: number; color: string; width: number; height: number };

/** What hangs on the line, by how far along it (0 at the west post, 1 at the east). */
export const WASHING: readonly Garment[] = [
  { kind: "shirt", at: 0.2, color: "#4f7fb8", width: 0.5, height: 0.56 },
  { kind: "towel", at: 0.52, color: "#e9cf6c", width: 0.46, height: 0.7 },
  { kind: "sock", at: 0.76, color: "#c84a3a", width: 0.1, height: 0.3 },
  { kind: "sock", at: 0.84, color: "#c84a3a", width: 0.1, height: 0.3 },
];

/** The washing is out by day from spring to fall, but not in rain or fog, when it would never dry. */
export function washingOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season !== "winter" && sky !== "rain" && sky !== "fog";
}

/** Where on the line a point `at` of the way along hangs, with the line's sag. */
export function linePoint(at: number) {
  return {
    x: LINE_FROM.x + (LINE_TO.x - LINE_FROM.x) * at,
    y: LINE_Y - LINE_SAG * 4 * at * (1 - at),
    z: LINE_FROM.z + (LINE_TO.z - LINE_FROM.z) * at,
  };
}

/**
 * How far garment `i` swings about the line `time` seconds in (radians about +x; positive lifts its
 * hem toward -z). It blows out downwind, further on a windier day, and flaps more as the wind fills it;
 * each garment flaps on its own beat. `still` holds it at its lean.
 */
export function garmentSwing(i: number, time: number, wind: { x: number; z: number }, still = false) {
  const speed = Math.hypot(wind.x, wind.z);
  const fill = Math.min(1, speed / FULL_WIND);
  // Only the wind across the line lifts the washing; wind along it just makes it shiver.
  const across = Math.max(-1, Math.min(1, wind.z / FULL_WIND));
  const lean = -across * MAX_LEAN;
  if (still) return lean;
  const flap = (0.04 + fill * 0.16) * Math.sin(time * (2.2 + fill * 5) + i * 1.7) + fill * 0.05 * Math.sin(time * 11 + i * 3.1);
  return lean + flap;
}
