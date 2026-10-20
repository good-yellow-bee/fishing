import { behindStart, behindStep, type BehindTiming, type BehindVisit } from "./behindVisit";
import { hedgehogPath } from "./hedgehogWalk";
import { robinGround, type Angler } from "./robinHop";
import { VISIT_SEC, crossingAt, type ToadPose, type ToadWay } from "./toadHop";

/**
 * The dock's rain toad on a bank too: while you stand fishing ashore on a wet evening or night, now and then
 * one creeps out of the wet grass behind you and hops across behind your heels, sitting between hops, and
 * back into the grass. Gated like the dock toad (toadOut); a small state stepped each frame.
 */

type Ground = (x: number, z: number) => number | null;

export type BankToadState = BehindVisit<ToadWay>;

/** The first comes a little while after you settle, and the next this long after one has gone. */
export const FIRST_SEC = 10;
export const GAP_SEC = 60;
const TIMING: BehindTiming = { firstSec: FIRST_SEC, visitSec: VISIT_SEC, gapSec: GAP_SEC };
/** How far to each side of the angler its way runs. */
const ACROSS = 0.8;

export function bankToadStart(time: number): BankToadState {
  return behindStart(time, TIMING);
}

/** Moves the state on to `time`. `settled` while the angler stands ashore; once it is out it hops on across whatever they do. */
export function bankToadStep(state: BankToadState, time: number, angler: Angler, settled: boolean, ground: Ground = robinGround): BankToadState {
  return behindStep(state, time, angler, settled, TIMING, () => {
    const path = hedgehogPath(angler, ground, ACROSS);
    return path && { ...path, y: (x: number, z: number) => ground(x, z) ?? path.from.y, edges: false };
  });
}

export const BANK_TOAD_AWAY: ToadPose = { x: 0, y: 0, z: 0, here: false, yaw: 0, kick: 0, throat: 0, blink: 0, show: 0 };

/** The toad at `time` in `state`. */
export function bankToadAt(state: BankToadState, time: number): ToadPose {
  return state.mode === "away" ? BANK_TOAD_AWAY : crossingAt(time - state.since, state.way);
}
