/**
 * A fall leaf on the angler's cap: every so often one comes spinning down out of the trees and
 * settles on the cap, and there it rides until your next cast shakes it off the brim. Then, a while
 * later, another may come down. A small state stepped each frame; positions are in the head bone's frame.
 */

type Point = { x: number; y: number; z: number };

/** A new leaf comes this long after the last one went, the first a little after you arrive, and takes this long to fall. */
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

export type CapLeafState =
  | { mode: "away"; nextAt: number }
  | { mode: "falling"; since: number; shaken: boolean }
  | { mode: "resting" }
  | { mode: "sliding"; since: number };

/** Before the first leaf: it comes a little after you arrive. */
export const CAP_LEAF_START: CapLeafState = { mode: "away", nextAt: FIRST_SEC };

/**
 * The leaf's state moved on to `time`; `threw` when the angler has just thrown a cast. A throw while it
 * falls lets it land first, then shakes it off; a throw while it rests shakes it off; the next leaf comes
 * a round after the last one has gone.
 */
export function capLeafStep(state: CapLeafState, time: number, threw: boolean): CapLeafState {
  switch (state.mode) {
    case "away":
      return time >= state.nextAt ? capLeafStep({ mode: "falling", since: state.nextAt, shaken: false }, time, threw) : state;
    case "falling": {
      const shaken = state.shaken || threw;
      if (time - state.since < CAP_LEAF_FALL_SEC) return shaken === state.shaken ? state : { ...state, shaken };
      return shaken ? { mode: "sliding", since: state.since + CAP_LEAF_FALL_SEC } : { mode: "resting" };
    }
    case "resting":
      return threw ? { mode: "sliding", since: time } : state;
    case "sliding":
      return time - state.since >= CAP_LEAF_SLIDE_SEC ? { mode: "away", nextAt: state.since + CAP_LEAF_SLIDE_SEC + CAP_LEAF_EVERY_SEC } : state;
  }
}

/** The leaf at `time` in `state`. `still` sets it straight down on the cap, and a shake simply takes it away. */
export function capLeafAt(state: CapLeafState, time: number, still = false): CapLeafPose {
  switch (state.mode) {
    case "away":
      return GONE;
    case "falling":
      return still ? RESTING : falling(time - state.since);
    case "resting":
      return RESTING;
    case "sliding":
      return still ? GONE : sliding(time - state.since);
  }
}
