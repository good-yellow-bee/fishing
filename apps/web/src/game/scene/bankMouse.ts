import { behindStart, behindStep, type BehindTiming, type BehindVisit } from "./behindVisit";
import { hedgehogPath } from "./hedgehogWalk";
import { VISIT_SEC, mouseCrossingAt, mouseTrailAt, type MousePose, type MouseWay } from "./mouseScurry";
import { robinGround, type Angler } from "./robinHop";

/**
 * A wood mouse on a winter bank: at dusk and through the night, while you stand fishing ashore, now and then
 * one pops up out of the snow behind you, scurries across in dashes with stops, sits up to nibble, and dives
 * back under, leaving a line of tiny tracks in the snow that fade before the next one comes.
 */

type Ground = (x: number, z: number) => number | null;

export type BankMouseState = BehindVisit<MouseWay>;

export const FIRST_SEC = 9;
export const GAP_SEC = 50;
const TIMING: BehindTiming = { firstSec: FIRST_SEC, visitSec: VISIT_SEC, gapSec: GAP_SEC };
/** How far to each side of the angler it runs, and how far its crumb sits back from the line between. */
const ACROSS = 0.65;
const CRUMB_BACK = 0.12;
/** Its tracks fade over this long once it has gone. */
export const TRACKS_FADE_SEC = 35;

export function bankMouseStart(time: number): BankMouseState {
  return behindStart(time, TIMING);
}

/** Moves the state on to `time`; `settled` while the angler stands ashore. */
export function bankMouseStep(state: BankMouseState, time: number, angler: Angler, settled: boolean, ground: Ground = robinGround): BankMouseState {
  return behindStep(state, time, angler, settled, TIMING, () => {
    const path = hedgehogPath(angler, ground, ACROSS);
    if (!path) return null;
    const crumb = { x: (path.from.x + path.to.x) / 2 - Math.sin(angler.yaw) * CRUMB_BACK, z: (path.from.z + path.to.z) / 2 - Math.cos(angler.yaw) * CRUMB_BACK };
    if (ground(crumb.x, crumb.z) === null) return null;
    return { from: path.from, crumb, to: path.to, y: (x: number, z: number) => ground(x, z) ?? path.from.y, edges: false };
  });
}

export const BANK_MOUSE_AWAY: MousePose = { x: 0, y: 0, z: 0, here: false, yaw: 0, running: 0, sitting: 0, nibble: 0, show: 0 };

/** The mouse at `time` in `state`. */
export function bankMouseAt(state: BankMouseState, time: number): MousePose {
  return state.mode === "away" ? BANK_MOUSE_AWAY : mouseCrossingAt(time - state.since, state.way);
}

/** Its last run's tracks: its way, how far along it they reach, and when it went (null while still running). */
export type MouseTracks = { way: MouseWay; reach: number; goneAt: number | null };

/** The tracks at `time`, from the last frame's: laid as it runs, kept once it has gone until they fade. */
export function nextTracks(state: BankMouseState, last: MouseTracks | null, time: number): MouseTracks | null {
  if (state.mode === "visiting") return { way: state.way, reach: mouseTrailAt(time - state.since, state.way), goneAt: null };
  if (!last) return null;
  const tracks = last.goneAt === null ? { ...last, goneAt: time } : last;
  return tracksShow(tracks, time) > 0 ? tracks : null;
}

/** How strongly the tracks show at `time`, 1 down to 0 as they fade. */
export function tracksShow(tracks: MouseTracks, time: number) {
  return tracks.goneAt === null ? 1 : Math.max(0, 1 - (time - tracks.goneAt) / TRACKS_FADE_SEC);
}

/** Footprints this far apart along its way, and this far to each side of it. */
const TRACK_STEP = 0.045;
const TRACK_SIDE = 0.016;

/** Where its footprints lie (on the ground, alternating side to side), as far as its tracks reach. */
export function trackPrints(tracks: MouseTracks, max: number) {
  const { from, crumb, to } = tracks.way;
  const first = Math.hypot(crumb.x - from.x, crumb.z - from.z);
  const second = Math.hypot(to.x - crumb.x, to.z - crumb.z);
  const prints: { x: number; y: number; z: number }[] = [];
  for (let d = TRACK_STEP / 2; d < tracks.reach && prints.length < max; d += TRACK_STEP) {
    const [a, b, k] = d < first ? [from, crumb, d / first] : [crumb, to, Math.min(1, (d - first) / Math.max(1e-6, second))];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const side = (prints.length % 2 ? 1 : -1) * TRACK_SIDE;
    const x = a.x + (b.x - a.x) * k - ((b.z - a.z) / length) * side;
    const z = a.z + (b.z - a.z) * k + ((b.x - a.x) / length) * side;
    prints.push({ x, y: tracks.way.y(x, z), z });
  }
  return prints;
}
