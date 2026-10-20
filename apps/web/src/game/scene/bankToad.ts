import { hedgehogPath } from "./hedgehogWalk";
import { robinGround, type Angler } from "./robinHop";
import { VISIT_SEC, crossingAt, type ToadPose } from "./toadHop";

/**
 * The dock's rain toad on a bank too: while you stand fishing ashore on a wet evening or night, now and then
 * one creeps out of the wet grass behind you and hops across behind your heels, sitting between hops, and
 * back into the grass. Gated like the dock toad (toadOut); a small state stepped each frame.
 */

type Spot = { x: number; y: number; z: number };
type Ground = (x: number, z: number) => number | null;

export type BankToadState = { mode: "away"; nextAt: number } | { mode: "crossing"; since: number; from: Spot; to: Spot };

/** The first comes a little while after you settle, and the next this long after one has gone. */
export const FIRST_SEC = 10;
export const GAP_SEC = 60;
/** How far to each side of the angler its way runs. */
const ACROSS = 0.8;

export function bankToadStart(time: number): BankToadState {
  return { mode: "away", nextAt: time + FIRST_SEC };
}

/** Moves the state on to `time`. `settled` while the angler stands ashore; once it is out it hops on across whatever they do. */
export function bankToadStep(state: BankToadState, time: number, angler: Angler, settled: boolean, ground: Ground = robinGround): BankToadState {
  if (state.mode === "crossing") return time - state.since >= VISIT_SEC ? { mode: "away", nextAt: time + GAP_SEC } : state;
  if (!settled || angler.moving) return state.nextAt >= time + FIRST_SEC ? state : { mode: "away", nextAt: time + FIRST_SEC };
  if (time < state.nextAt) return state;
  const path = hedgehogPath(angler, ground, ACROSS);
  return path ? { mode: "crossing", since: time, ...path } : { mode: "away", nextAt: time + GAP_SEC };
}

const AWAY: ToadPose = { x: 0, y: 0, z: 0, here: false, yaw: 0, kick: 0, throat: 0, blink: 0, show: 0 };

/** The toad at `time` in `state`, on `ground`'s height. `still` sits it in the middle of its way. */
export function bankToadAt(state: BankToadState, time: number, still = false, ground: Ground = robinGround): ToadPose {
  if (state.mode === "away") return AWAY;
  const way = { from: state.from, to: state.to, y: (x: number, z: number) => ground(x, z) ?? state.from.y, edges: false };
  return crossingAt(time - state.since, way, still);
}
