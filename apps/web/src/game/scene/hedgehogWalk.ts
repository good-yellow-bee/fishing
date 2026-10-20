import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import type { Angler } from "./robinHop";
import { robinGround } from "./robinHop";
import { smoothstep } from "./visitClock";

/**
 * A hedgehog on the bank on dry evenings: while you stand fishing ashore, now and then one snuffles past
 * behind you on the bank, from one side to the other, stopping to sniff about; a strike makes it curl up
 * into a ball until the fuss is over, and then it uncurls and trundles on. Spring to fall (it sleeps the
 * winter through), dusk and night, not in the rain. A small state stepped each frame.
 */

/** Out at dusk and night from spring to fall, not in the rain. */
export function hedgehogOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dusk" || hour === "night") && season !== "winter" && sky !== "rain";
}

type Spot = { x: number; y: number; z: number };

export type HedgehogState =
  | { mode: "away"; nextAt: number }
  /** `held`: the time it spent curled up in earlier curls this walk; `curledAt`: when its latest curl began. */
  | { mode: "walking"; since: number; from: Spot; to: Spot; held: number; curledAt: number };

/** The first comes a little while after you settle, and the next this long after one has gone by. */
export const FIRST_SEC = 8;
export const GAP_SEC = 55;
/** Its way past, behind the angler from one side to the other, and how long it takes. */
const ACROSS = 1.7;
const BEHIND = 0.9;
export const WALK_SEC = 18;
/** Where along its way it stops to sniff, as shares of the walk, and for how long. */
const SNIFFS: readonly { at: number; sec: number }[] = [
  { at: 0.3, sec: 2.2 },
  { at: 0.62, sec: 2.8 },
];
const SNIFF_TOTAL = SNIFFS.reduce((a, b) => a + b.sec, 0);
/** Curled up after a strike, then uncurling. */
export const CURL_SEC = 5;
const UNCURL_SEC = 0.8;

export type HedgehogPose = Spot & {
  here: boolean;
  yaw: number;
  /** Curled into a ball, 0 open to 1 a tight ball. */
  curl: number;
  /** Its nose working, 0 to 1, as it sniffs. */
  sniff: number;
  /** Its legs going, 0 standing to 1 trotting. */
  trot: number;
};

const NOWHERE: HedgehogPose = { x: 0, y: 0, z: 0, here: false, yaw: 0, curl: 0, sniff: 0, trot: 0 };

export function hedgehogStart(time: number): HedgehogState {
  return { mode: "away", nextAt: time + FIRST_SEC };
}

/** Its way past `angler`, behind them, on dry land all along: one way or the other, or null where the bank is wet. */
export function hedgehogPath(angler: Angler, ground: (x: number, z: number) => number | null): { from: Spot; to: Spot } | null {
  const at = (side: number, back: number) => {
    const x = angler.x + side * Math.cos(angler.yaw) - back * Math.sin(angler.yaw);
    const z = angler.z - side * Math.sin(angler.yaw) - back * Math.cos(angler.yaw);
    const y = ground(x, z);
    return y === null ? null : { x, y, z };
  };
  for (const back of [BEHIND, BEHIND * 1.5]) {
    const points = [-1, -0.5, 0, 0.5, 1].map((k) => at(k * ACROSS, back));
    if (points.every((p) => p !== null)) return { from: points[0]!, to: points[4]! };
  }
  return null;
}

/** Moves the state on to `time`. `settled` while the angler stands ashore; `struck` on the frame they strike. */
export function hedgehogStep(
  state: HedgehogState,
  time: number,
  angler: Angler,
  settled: boolean,
  struck: boolean,
  ground: (x: number, z: number) => number | null = robinGround,
): HedgehogState {
  if (state.mode === "away") {
    if (!settled || angler.moving) return { mode: "away", nextAt: Math.max(state.nextAt, time + FIRST_SEC) };
    if (time < state.nextAt) return state;
    const path = hedgehogPath(angler, ground);
    return path ? { mode: "walking", since: time, ...path, held: 0, curledAt: -Infinity } : { mode: "away", nextAt: time + GAP_SEC };
  }
  if (walkedAt(state, time) >= WALK_SEC + SNIFF_TOTAL) return { mode: "away", nextAt: time + GAP_SEC };
  // A strike curls it up, unless it is curled up already; its walk waits while it is.
  if (struck && time - state.curledAt >= CURL_SEC + UNCURL_SEC) {
    return { ...state, held: state.held + (state.curledAt > -Infinity ? CURL_SEC + UNCURL_SEC : 0), curledAt: time };
  }
  return state;
}

/** How long it has been on its way at `time`, not counting the time it has spent curled up. */
function walkedAt(state: Extract<HedgehogState, { mode: "walking" }>, time: number) {
  const curling = state.curledAt > -Infinity ? Math.min(time - state.curledAt, CURL_SEC + UNCURL_SEC) : 0;
  return time - state.since - state.held - curling;
}

/** The hedgehog at `time` in `state`. `still` holds it standing where it comes in. */
export function hedgehogAt(state: HedgehogState, time: number, still = false): HedgehogPose {
  if (state.mode === "away") return NOWHERE;
  const yaw = Math.atan2(state.to.x - state.from.x, state.to.z - state.from.z);
  const curledFor = time - state.curledAt;
  const curl = curledFor < CURL_SEC ? smoothstep(curledFor / 0.25) : curledFor < CURL_SEC + UNCURL_SEC ? 1 - smoothstep((curledFor - CURL_SEC) / UNCURL_SEC) : 0;
  const walked = still ? 0 : walkedAt(state, time);
  // Along its way, less the time it has stood sniffing.
  let moving = walked;
  let sniff = 0;
  for (const stop of SNIFFS) {
    const start = stop.at * WALK_SEC;
    if (moving < start) break;
    if (moving < start + stop.sec) {
      sniff = Math.sin(((moving - start) / stop.sec) * Math.PI);
      moving = start;
      break;
    }
    moving -= stop.sec;
  }
  const k = Math.min(1, Math.max(0, moving / WALK_SEC));
  return {
    here: true,
    x: state.from.x + (state.to.x - state.from.x) * k,
    y: state.from.y + (state.to.y - state.from.y) * k,
    z: state.from.z + (state.to.z - state.from.z) * k,
    yaw,
    curl,
    sniff: curl > 0 ? 0 : sniff,
    trot: still || curl > 0 || sniff > 0 ? 0 : 1,
  };
}
