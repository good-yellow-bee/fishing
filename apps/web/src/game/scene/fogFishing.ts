import type { LakeHour, Sky } from "@stillwater/shared";

/**
 * A lone angler fishing from a rowboat anchored out on the lake on foggy days: the boat swings
 * slowly on its anchor rope while the angler sits with the rod out and the float on the water,
 * now and then reeling in and casting again to a new spot. Pure in time.
 */

/** Where the boat lies at anchor: out on the north-west water, clear of the fishing spots, the loon's loop and the moored boats. */
export const ANCHORED_AT = { x: -9.5, z: -9.5 };
/** Which way the bow points, on average, and how far the boat swings either side of it. */
export const BOAT_HEADING = 0.9;
const SWING = 0.22;
/** Seconds the float sits before the angler reels in, to reel in, and to cast again. */
const WAIT_SEC = 19;
const REEL_SEC = 3.5;
const CAST_SEC = 1.4;
export const CAST_ROUND_SEC = WAIT_SEC + REEL_SEC + CAST_SEC;
/** How far out from the boat the float lands, from its nearest to its farthest. */
const NEAR = 3.2;
const FAR = 5.4;

/** Out whenever the fog is down, from dawn to dusk. */
export function fogAnglerOut(hour: LakeHour, sky: Sky | undefined) {
  return sky === "fog" && hour !== "night";
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Which way the boat's bow points `time` seconds in, swinging slowly on its anchor. */
export function boatYaw(time: number, still = false) {
  return BOAT_HEADING + (still ? 0 : SWING * Math.sin(time * 0.07) + 0.05 * Math.sin(time * 0.31 + 1));
}

/** Where the float lands on cast `n`: out over the boat's right side, toward the lake's middle. */
export function floatSpot(n: number) {
  const angle = BOAT_HEADING + Math.PI / 2 + (unit(n * 3 + 1) - 0.5) * 0.9;
  const reach = NEAR + unit(n * 3 + 2) * (FAR - NEAR);
  return { x: ANCHORED_AT.x + Math.sin(angle) * reach, z: ANCHORED_AT.z + Math.cos(angle) * reach };
}

/** How far out from the middle of the boat the rod tip reaches, and how high above the water it is when resting. */
export const TIP_REACH = 1.5;
const TIP_HIGH = 1.1;
/** The rod's angle above level, resting out over the water, raised as the angler reels in, and swung back over the shoulder to cast. */
const ROD_REST = 0.45;
const ROD_RAISED = 1;
const ROD_BACK = 2.1;

export type AnglerPose = {
  /** The rod's angle above level, out ahead of the angler: past a right angle it is swung back over their shoulder. */
  rod: number;
  /** Which way the angler and the rod face, as a world heading (0 is +z). */
  aim: number;
  /** The float: where it is and how high above the water, or null while it hangs at the rod tip. */
  float: { x: number; z: number; y: number } | null;
};

function heading(spot: { x: number; z: number }) {
  return Math.atan2(spot.x - ANCHORED_AT.x, spot.z - ANCHORED_AT.z);
}

/** Roughly where the rod tip is over the water, facing `aim`. */
function tipNear(aim: number) {
  return { x: ANCHORED_AT.x + Math.sin(aim) * TIP_REACH, z: ANCHORED_AT.z + Math.cos(aim) * TIP_REACH };
}

/** The angler `time` seconds in. `still` holds them waiting with the float out. */
export function anglerAt(time: number, still = false): AnglerPose {
  const n = still ? 0 : Math.floor(time / CAST_ROUND_SEC);
  const into = still ? 2 : time - n * CAST_ROUND_SEC;
  const spot = floatSpot(n);
  const aim = heading(spot);
  if (into < WAIT_SEC) {
    // A twitch of the rod tip now and then, as a fish noses the bait or the angler gets restless.
    const twitch = still ? 0 : Math.max(0, Math.sin(into * 0.9 + n)) ** 8 * 0.1;
    return { rod: ROD_REST + twitch, aim, float: { ...spot, y: 0 } };
  }
  if (into < WAIT_SEC + REEL_SEC) {
    // Reeling in: the rod comes up and the float skims back toward the boat until it hangs at the tip.
    const k = (into - WAIT_SEC) / REEL_SEC;
    const tip = tipNear(aim);
    const float = k < 0.92 ? { x: spot.x + (tip.x - spot.x) * k, z: spot.z + (tip.z - spot.z) * k, y: 0 } : null;
    return { rod: ROD_REST + (ROD_RAISED - ROD_REST) * k, aim, float };
  }
  // The cast: the rod swings back over the shoulder, turning toward the next spot, and flicks forward; the float flies out in an arc.
  const k = (into - WAIT_SEC - REEL_SEC) / CAST_SEC;
  const next = floatSpot(n + 1);
  const nextAim = heading(next);
  const turn = aim + (nextAim - aim) * Math.min(1, k * 2.2);
  if (k < 0.45) return { rod: ROD_RAISED + (ROD_BACK - ROD_RAISED) * (k / 0.45), aim: turn, float: null };
  const f = (k - 0.45) / 0.55;
  const tip = tipNear(nextAim);
  return {
    rod: ROD_BACK + (ROD_REST - ROD_BACK) * Math.min(1, f * 1.6),
    aim: turn,
    float: { x: tip.x + (next.x - tip.x) * f, z: tip.z + (next.z - tip.z) * f, y: TIP_HIGH * (1 - f) + 1.4 * Math.sin(Math.PI * f) },
  };
}
