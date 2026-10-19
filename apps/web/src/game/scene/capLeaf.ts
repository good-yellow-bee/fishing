import { visitAt } from "./visitClock";

/**
 * A fall leaf on the angler's cap: every so often one comes spinning down out of the trees and
 * settles on the cap, and there it rides until your next cast shakes it off the brim. Then, a while
 * later, another may come down. Pure in time and the last cast; positions are in the head bone's frame.
 */

type Point = { x: number; y: number; z: number };

/** A leaf comes down this often, the first a little after you arrive, and takes this long to fall. */
export const CAP_LEAF_EVERY_SEC = 45;
const FIRST_SEC = 12;
export const CAP_LEAF_FALL_SEC = 3.6;
/** How long it takes to slide off the brim and drop out of sight once shaken. */
export const CAP_LEAF_SLIDE_SEC = 1.3;

/** Where it starts, up and behind, and where it settles on the back of the cap, tipped toward you. */
const FROM: Point = { x: 0.7, y: 1.4, z: -0.3 };
export const CAP_LEAF_REST: Point = { x: 0.05, y: 0.45, z: -0.13 };
const REST_TURN = { x: -Math.PI / 2 - 0.65, y: 0, z: 0.7 };

export type CapLeafPose = Point & { here: boolean; rx: number; ry: number; rz: number };

const GONE: CapLeafPose = { ...CAP_LEAF_REST, here: false, rx: 0, ry: 0, rz: 0 };
const RESTING: CapLeafPose = { ...CAP_LEAF_REST, here: true, rx: REST_TURN.x, ry: REST_TURN.y, rz: REST_TURN.z };

function falling(into: number): CapLeafPose {
  if (into >= CAP_LEAF_FALL_SEC) return RESTING;
  const p = into / CAP_LEAF_FALL_SEC;
  const ease = p * (2 - p);
  const sway = (1 - p) * 0.35;
  // It rocks side to side as it drops, the way a leaf seesaws down, and settles flat.
  return {
    here: true,
    x: FROM.x + (CAP_LEAF_REST.x - FROM.x) * ease + Math.sin(into * 3.4) * sway,
    y: FROM.y + (CAP_LEAF_REST.y - FROM.y) * p,
    z: FROM.z + (CAP_LEAF_REST.z - FROM.z) * ease,
    rx: REST_TURN.x + Math.sin(into * 3.4 + 1.2) * (1 - p) * 0.9,
    ry: into * 2.2 * (1 - p),
    rz: REST_TURN.z + Math.cos(into * 3.4) * (1 - p) * 0.8,
  };
}

function sliding(away: number): CapLeafPose {
  if (away >= CAP_LEAF_SLIDE_SEC) return GONE;
  const k = away / CAP_LEAF_SLIDE_SEC;
  return {
    here: true,
    x: CAP_LEAF_REST.x + 0.6 * k,
    y: CAP_LEAF_REST.y + 0.1 * k - 1.6 * k * k,
    z: CAP_LEAF_REST.z - 0.05 * k,
    rx: REST_TURN.x + 2.4 * k,
    ry: 3 * k,
    rz: REST_TURN.z + 1.5 * k,
  };
}

/**
 * The leaf at `time`, given the angler's last cast at `castAt` (-Infinity before any). A cast while it
 * is still falling lets it land first. Each cast clears the cap, and the next leaf comes in the next round.
 * `still` sets it straight down on the cap, and a cast simply takes it away.
 */
export function capLeafAt(time: number, castAt = -Infinity, still = false): CapLeafPose {
  const now = visitAt(time, FIRST_SEC, CAP_LEAF_EVERY_SEC);
  if (now.index < 0) return GONE;
  const cast = visitAt(castAt, FIRST_SEC, CAP_LEAF_EVERY_SEC);
  if (cast.index === now.index) {
    const off = Math.max(cast.into, CAP_LEAF_FALL_SEC);
    if (now.into >= off) return still ? GONE : sliding(now.into - off);
    return still ? RESTING : falling(now.into);
  }
  // No cast this round: a fresh leaf comes down the round after the last cast, and stays.
  const fresh = castAt === -Infinity ? now.index === 0 : now.index === cast.index + 1;
  return fresh && !still ? falling(now.into) : RESTING;
}
