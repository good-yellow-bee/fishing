import type { LakeSeason } from "@stillwater/shared";
import { DUCKWEED_BEDS, MAX_PUSH, duckweedAmount } from "./scene/duckweedBeds";
import { pollenHeading } from "./scene/pollenDrift";

/** A lure on top over a duckweed mat draws the bass lurking in its shade, so it bites this much sooner. */
export const DUCKWEED_TOPWATER_WAIT = 0.85;
/** Any other lure comes through bearded with duckweed and the fish turn from it, so it bites this much slower. */
export const DUCKWEED_FOUL_WAIT = 1.2;
/** The thick middle of a bed, as a share of its radius, where a lure lands in the mat rather than at its ragged rim. */
const MAT_CORE = 0.75;

/** Whether a lure landing at (x, z) lands in a duckweed mat: summer and fall only, each bed nudged downwind the way the scene draws it. */
export function inDuckweed(season: LakeSeason | undefined, wind: { x: number; z: number } | undefined, x: number, z: number) {
  if (!season || duckweedAmount(season) === 0) return false;
  const drift = wind ?? { x: 0, z: 0 };
  const head = pollenHeading(drift);
  const speed = Math.hypot(drift.x, drift.z);
  const push = Math.min(MAX_PUSH, speed * 8);
  const stretch = 1 + Math.min(0.5, speed * 4);
  return DUCKWEED_BEDS.some((bed) => {
    const dx = x - bed.x;
    const dz = z - bed.z;
    const along = (dx * head.x + dz * head.z - push) / stretch;
    const across = -dx * head.z + dz * head.x;
    return Math.hypot(along, across) <= bed.radius * MAT_CORE;
  });
}

/** How a cast into the duckweed fishes: a popper rides over the mat, anything else comes back bearded with weed. */
export function duckweedCast(inMat: boolean, topwater: boolean): "topwater" | "fouled" | null {
  if (!inMat) return null;
  return topwater ? "topwater" : "fouled";
}
