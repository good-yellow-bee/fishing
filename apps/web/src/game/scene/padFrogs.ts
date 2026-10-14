import type { LakeHour, LakeSeason } from "@stillwater/shared";
import type { Splash } from "./duckFlush";

/**
 * Frogs sitting on lily pads on warm days and evenings. Each sits facing the
 * open water, puffing its throat now and then; a cast landing close sends it
 * plopping in, and it hops back onto its pad a while later. Pure functions of
 * time, like the turtle.
 */

/** The pads they sit on (matching lily pads in LakeWorld) and which way each faces. */
export const FROG_PADS = [
  { x: -6.8, z: 4.8, yaw: 1.2 },
  { x: 9.1, z: -7.7, yaw: -2.2 },
] as const;
/** A cast landing closer than this sends it in; only a fresh splash counts. */
export const FROG_SCARE_RADIUS = 4;
export const FROG_SPLASH_FRESH_SEC = 0.6;
/** The leap in, the time under, and the hop back up. */
export const FROG_LEAP_SEC = 0.45;
export const FROG_UNDER_SEC = 30;
export const FROG_HOP_SEC = 0.6;
/** How far off the pad it lands in the water, and the ring's life. */
export const FROG_LEAP_REACH = 0.9;
export const FROG_RING_SEC = 1.2;
/** Seconds between throat puffs, and how long one lasts. */
export const FROG_PUFF_GAP = 6;
export const FROG_PUFF_SEC = 0.8;

/** On the pads in spring and summer, from day into the evening. */
export function frogsOnPads(hour: LakeHour, season: LakeSeason) {
  return (season === "spring" || season === "summer") && (hour === "day" || hour === "dusk");
}

export type FrogState = { mode: "sitting" } | { mode: "under"; since: number };

export type FrogPose = {
  /** Offset from the pad, metres, along the water and up from the pad's top. */
  dx: number;
  dz: number;
  up: number;
  hidden: boolean;
  /** Throat puffed: 0 flat to 1 full. */
  puff: number;
  /** The ring where it went in or came out, 0..1 as it spreads; -1 when there is none. */
  ring: number;
};

export function stepFrog(state: FrogState, time: number, pad: { x: number; z: number }, splash: Splash): FrogState {
  if (state.mode === "under") return time - state.since >= FROG_LEAP_SEC + FROG_UNDER_SEC + FROG_HOP_SEC ? { mode: "sitting" } : state;
  const fresh = time - splash.at >= 0 && time - splash.at < FROG_SPLASH_FRESH_SEC;
  if (fresh && Math.hypot(pad.x - splash.x, pad.z - splash.z) < FROG_SCARE_RADIUS) return { mode: "under", since: time };
  return state;
}

/** Frog `index` at `time`. `still` keeps its throat flat, for reduced motion. */
export function frogPose(index: number, time: number, state: FrogState = { mode: "sitting" }, still = false): FrogPose {
  const pad = FROG_PADS[index % FROG_PADS.length]!;
  const outX = Math.sin(pad.yaw) * FROG_LEAP_REACH;
  const outZ = Math.cos(pad.yaw) * FROG_LEAP_REACH;
  if (state.mode === "under") {
    const since = time - state.since;
    if (since < FROG_LEAP_SEC) {
      // An arc off the pad's edge and down into the water.
      const k = since / FROG_LEAP_SEC;
      return { dx: outX * k, dz: outZ * k, up: Math.sin(k * Math.PI) * 0.35 - k * 0.15, hidden: false, puff: 0, ring: -1 };
    }
    const back = since - FROG_LEAP_SEC - FROG_UNDER_SEC;
    const ringIn = since - FROG_LEAP_SEC;
    if (back < 0) return { dx: outX, dz: outZ, up: -0.2, hidden: true, puff: 0, ring: ringIn < FROG_RING_SEC ? ringIn / FROG_RING_SEC : -1 };
    // Out of the water and a hop back up onto the pad.
    const k = Math.min(1, back / FROG_HOP_SEC);
    return { dx: outX * (1 - k), dz: outZ * (1 - k), up: Math.sin(k * Math.PI) * 0.25 - (1 - k) * 0.1, hidden: false, puff: 0, ring: k < 0.5 ? k / 0.5 : -1 };
  }
  if (still) return { dx: 0, dz: 0, up: 0, hidden: false, puff: 0, ring: -1 };
  const into = (((time + index * 2.3) % FROG_PUFF_GAP) + FROG_PUFF_GAP) % FROG_PUFF_GAP;
  const puff = into < FROG_PUFF_SEC ? Math.sin((into / FROG_PUFF_SEC) * Math.PI) : 0;
  return { dx: 0, dz: 0, up: 0, hidden: false, puff, ring: -1 };
}
