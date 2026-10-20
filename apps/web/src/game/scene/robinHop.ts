import { inLake } from "@stillwater/shared";
import { BANK_BOARDS, BANK_STAND_LIFT, BANK_TOP, onBankBoard } from "./bankWalk";
import type { RobinPose } from "./robinVisit";
import { smoothstep } from "./visitClock";

/**
 * The robin coming to you on the bank: while you stand ashore by day, off the dock and out of the boat,
 * now and then it flies in and lands by your feet, on the bank boards or the ground, hops about there a
 * little way, pecking and cocking its head, and flies off again; if you walk off or strike, it goes at once.
 * A small state stepped each frame.
 */

/** The height a robin stands at on dry land at (x, z): the bank boards' top where there are boards, else the ground; null on the water. */
export function robinGround(x: number, z: number): number | null {
  if (inLake(x, z)) return null;
  const board = BANK_BOARDS.find((b) => onBankBoard(b, x, z));
  return board ? BANK_TOP + (board.kind === "stand" ? BANK_STAND_LIFT : 0) : 0;
}

/** Where the angler stands and faces, and whether they are walking, as the robin sees them. */
export type Angler = { x: number; y: number; z: number; yaw: number; moving: boolean };

export type HopState =
  | { mode: "away"; nextAt: number }
  | { mode: "visiting"; since: number; x: number; y: number; z: number; yaw: number }
  | { mode: "leaving"; since: number; from: RobinPose };

/** It first comes a little while after you settle, and again this long after it leaves. */
export const FIRST_SEC = 6;
export const HOP_GAP_SEC = 40;
/** Flying in, about on the ground, and flying off. */
const IN_SEC = 1.4;
export const GROUND_SEC = 11;
const OUT_SEC = 1.4;
export const HOP_VISIT_SEC = IN_SEC + GROUND_SEC;
/** Where it lands, about the angler: at their side, a little behind them; the left if that is dry land, else the right. */
const BESIDE = { side: 0.6, ahead: -0.15 };
/** How far off it comes from and goes to, and how high. */
const AWAY_M = 5;
const AWAY_UP = 2;
/** Its hops about where it lands: little steps each way, with pauses between. */
const HOPS: readonly { at: number; dx: number; dz: number }[] = [
  { at: 1.5, dx: 0.12, dz: 0.05 },
  { at: 3.2, dx: -0.05, dz: 0.14 },
  { at: 5.6, dx: -0.16, dz: 0.02 },
  { at: 7.4, dx: 0.04, dz: -0.1 },
  { at: 9.3, dx: 0.1, dz: 0.06 },
];
const HOP_SEC = 0.22;


const NOWHERE: RobinPose = { x: 0, y: 0, z: 0, here: false, yaw: 0, flying: 0, look: 0, flick: 0 };

/** What else the robin minds: whether the dock robin is about (it never shows twice), a strike just now, and reduced motion. */
export type HopWorld = { dockRobinHere: boolean; struck: boolean; still: boolean; ground?: (x: number, z: number) => number | null };

/** The state moved on to `time`: `angler` is where the angler is; `settled` while they stand ashore off the dock and out of the boat. */
export function hopStep(state: HopState, time: number, angler: Angler, settled: boolean, world: HopWorld): HopState {
  const ground = world.ground ?? robinGround;
  switch (state.mode) {
    case "away": {
      if (!settled || angler.moving) return { mode: "away", nextAt: Math.max(state.nextAt, time + FIRST_SEC) };
      if (time < state.nextAt || world.dockRobinHere) return state;
      // Its spot at the angler's side, on dry land: their left, or their right if the left is the water.
      for (const side of [1, -1]) {
        const x = angler.x + side * Math.cos(angler.yaw) * BESIDE.side + Math.sin(angler.yaw) * BESIDE.ahead;
        const z = angler.z - side * Math.sin(angler.yaw) * BESIDE.side + Math.cos(angler.yaw) * BESIDE.ahead;
        const y = ground(x, z);
        if (y !== null) return { mode: "visiting", since: time, x, y, z, yaw: angler.yaw };
      }
      return { mode: "away", nextAt: time + HOP_GAP_SEC };
    }
    case "visiting":
      if (time - state.since >= HOP_VISIT_SEC || angler.moving || !settled || world.struck) return { mode: "leaving", since: time, from: hopAt(state, time, world.still) };
      return state;
    case "leaving":
      return time - state.since >= OUT_SEC ? { mode: "away", nextAt: time + HOP_GAP_SEC } : state;
  }
}

/** Where it comes in from or goes off to: off to the angler's left, up in the air. */
function offAt(x: number, y: number, z: number, yaw: number) {
  return { x: x + Math.cos(yaw) * AWAY_M, y: y + AWAY_UP, z: z - Math.sin(yaw) * AWAY_M };
}

/** A first visit a little after `time`, when the robin starts watching. */
export function hopStart(time: number): HopState {
  return { mode: "away", nextAt: time + FIRST_SEC };
}

/** The robin at `time` in `state`. `still` sits it on the ground where it lands. */
export function hopAt(state: HopState, time: number, still = false): RobinPose {
  if (state.mode === "away") return NOWHERE;
  if (state.mode === "leaving") {
    const k = smoothstep((time - state.since) / OUT_SEC);
    const off = offAt(state.from.x, state.from.y, state.from.z, state.from.yaw);
    return { ...state.from, x: state.from.x + (off.x - state.from.x) * k, y: state.from.y + (off.y - state.from.y) * k * k, z: state.from.z + (off.z - state.from.z) * k, yaw: Math.atan2(off.x - state.from.x, off.z - state.from.z), flying: 1, look: 0, flick: 0 };
  }
  const t = time - state.since;
  const facing = state.yaw + Math.PI * 0.75;
  if (!still && t < IN_SEC) {
    const k = smoothstep(t / IN_SEC);
    const from = offAt(state.x, state.y, state.z, state.yaw);
    return { here: true, x: from.x + (state.x - from.x) * k, y: state.y + (from.y - state.y) * (1 - k) * (1 - k), z: from.z + (state.z - from.z) * k, yaw: Math.atan2(state.x - from.x, state.z - from.z), flying: 1, look: 0, flick: 0 };
  }
  // On the ground: hops one way and another, pecking and cocking its head between them.
  let x = state.x;
  let z = state.z;
  let lift = 0;
  const g = still ? 0 : t - IN_SEC;
  for (const hop of HOPS) {
    if (g < hop.at) break;
    const k = Math.min(1, (g - hop.at) / HOP_SEC);
    x += hop.dx * k;
    z += hop.dz * k;
    if (k < 1) lift = 0.05 * Math.sin(Math.PI * k);
  }
  const peck = still ? 0 : Math.max(0, Math.sin(g * 2.3) ** 16);
  return {
    here: true,
    x,
    y: state.y + lift,
    z,
    // It turns this way and that about where it faces, smoothly.
    yaw: facing + (still ? 0 : 0.5 * Math.sin(g * 0.8) * Math.sin(g * 0.37 + 1)),
    flying: 0,
    look: still ? 0 : 0.6 * Math.sin(Math.round(g / 0.8) * 2.3) * (1 - peck),
    flick: peck,
  };
}
