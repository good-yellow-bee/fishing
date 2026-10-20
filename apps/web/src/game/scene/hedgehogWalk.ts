import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { besideAngler, robinGround, type Angler } from "./robinHop";
import { smoothstep } from "./visitClock";

/**
 * A hedgehog on the bank on dry evenings: while you stand fishing ashore, now and then one snuffles past
 * behind you on the bank, from one side to the other, stopping to sniff about. Any fuss (a strike, a fish
 * on, the angler walking past) curls it into a ball until a little while after it is over; then it
 * uncurls and trundles on. Spring to fall (it sleeps the winter through), dusk and night, not in the rain.
 * A small state stepped each frame.
 */

/** Out at dusk and night from spring to fall, not in the rain. */
export function hedgehogOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dusk" || hour === "night") && season !== "winter" && sky !== "rain";
}

type Spot = { x: number; y: number; z: number };
type Ground = (x: number, z: number) => number | null;

/** `walked`: seconds of its pass done (time curled up does not count); `fussAt`: when it last had cause to curl; `curledAt`: when it last curled. */
export type HedgehogState = { mode: "away"; nextAt: number } | { mode: "walking"; from: Spot; to: Spot; walked: number; fussAt: number; curledAt: number };

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
export const PASS_SEC = WALK_SEC + SNIFFS.reduce((a, b) => a + b.sec, 0);
/** It stays curled this long after the fuss, then uncurls; it curls up this fast. */
export const CURL_SEC = 5;
const UNCURL_SEC = 0.8;
const CURL_IN_SEC = 0.25;
/** It grows into view and out of it over this long at the ends of its way. */
const SHOW_SEC = 0.6;
/** How finely its way is checked for dry land, metres. */
const CHECK_M = 0.2;

export type HedgehogPose = Spot & {
  here: boolean;
  yaw: number;
  /** How much of it shows, 0 to 1, at the ends of its way. */
  show: number;
  /** Curled into a ball, 0 open to 1 a tight ball. */
  curl: number;
  /** Its nose working, 0 to 1, as it sniffs. */
  sniff: number;
  /** Its legs going, 0 standing to 1 trotting, and how far it has trotted (for the bob). */
  trot: number;
  stride: number;
};

const NOWHERE: HedgehogPose = { x: 0, y: 0, z: 0, here: false, yaw: 0, show: 0, curl: 0, sniff: 0, trot: 0, stride: 0 };

export function hedgehogStart(time: number): HedgehogState {
  return { mode: "away", nextAt: time + FIRST_SEC };
}

/** Its way past `angler`, behind them, `across` metres to each side, on dry land all along: or null where the bank is wet. */
export function hedgehogPath(angler: Angler, ground: Ground, across = ACROSS): { from: Spot; to: Spot } | null {
  const steps = Math.ceil((2 * across) / CHECK_M);
  for (const back of [BEHIND, BEHIND * 1.5]) {
    const points = Array.from({ length: steps + 1 }, (_, i) => besideAngler(angler, -across + (2 * across * i) / steps, -back, ground));
    if (points.every((p) => p !== null)) return { from: points[0]!, to: points[steps]! };
  }
  return null;
}

/** How curled it is at `time`, 0 to 1: rolled up fast at a fuss, unrolled a while after it ends. */
function curlAt(state: Extract<HedgehogState, { mode: "walking" }>, time: number, still: boolean) {
  const since = time - state.fussAt;
  if (since >= CURL_SEC + UNCURL_SEC) return 0;
  if (still) return since < CURL_SEC ? 1 : 0;
  const up = smoothstep((time - state.curledAt) / CURL_IN_SEC);
  return since < CURL_SEC ? up : up * (1 - smoothstep((since - CURL_SEC) / UNCURL_SEC));
}

/**
 * Moves the state on by `delta` seconds to `time`. `settled` while the angler stands ashore; `fuss` while
 * there is something to curl up at (a strike, a fish on, the angler walking).
 */
export function hedgehogStep(state: HedgehogState, time: number, delta: number, angler: Angler, settled: boolean, fuss: boolean, ground: Ground = robinGround): HedgehogState {
  if (state.mode === "away") {
    if (!settled || angler.moving) return state.nextAt >= time + FIRST_SEC ? state : { mode: "away", nextAt: time + FIRST_SEC };
    // It waits for any fuss to be over before it sets off.
    if (time < state.nextAt || fuss) return state;
    const path = hedgehogPath(angler, ground);
    if (path) return { mode: "walking", ...path, walked: 0, fussAt: -Infinity, curledAt: -Infinity };
    return { mode: "away", nextAt: time + GAP_SEC };
  }
  if (state.walked >= PASS_SEC) return { mode: "away", nextAt: time + GAP_SEC };
  if (fuss) {
    const curled = time - state.fussAt < CURL_SEC + UNCURL_SEC;
    return { ...state, fussAt: time, curledAt: curled ? state.curledAt : time };
  }
  if (curlAt(state, time, false) > 0) return state;
  return { ...state, walked: state.walked + delta };
}

/** The hedgehog at `time` in `state`, standing at `ground`'s height. `still` holds it where it comes in. */
export function hedgehogAt(state: HedgehogState, time: number, still = false, ground: Ground = robinGround): HedgehogPose {
  if (state.mode === "away") return NOWHERE;
  const yaw = Math.atan2(state.to.x - state.from.x, state.to.z - state.from.z);
  const curl = curlAt(state, time, still);
  const walked = still ? 0 : state.walked;
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
  const x = state.from.x + (state.to.x - state.from.x) * k;
  const z = state.from.z + (state.to.z - state.from.z) * k;
  return {
    here: true,
    x,
    y: ground(x, z) ?? state.from.y,
    z,
    yaw,
    show: still ? 1 : Math.min(smoothstep(walked / SHOW_SEC), smoothstep((PASS_SEC - walked) / SHOW_SEC)),
    curl,
    sniff: curl > 0 ? 0 : sniff,
    trot: still || curl > 0 || sniff > 0 ? 0 : 1,
    stride: moving,
  };
}
