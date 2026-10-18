import { type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import type { Splash } from "./duckFlush";
import { shoreInland } from "./water";

/**
 * A bull moose that wades out of the north-east woods into the shallows at dawn and dusk to feed on water plants.
 * Each visit it walks in, plunges its head under, lifts it streaming and chews, steps along to a second patch
 * and feeds again, then wades back into the trees. A cast landing close sends it splashing off until the
 * next visit. Pure functions of time, like the deer's.
 */

/** Where it comes out of the trees, and the two patches of water plants it feeds on. */
export const MOOSE_WOODS = { x: 14.5, z: -20.5 } as const;
export const MOOSE_FEED_A = { x: 9.6, z: -10.6 } as const;
export const MOOSE_FEED_B = { x: 7.4, z: -11.2 } as const;
/** One visit every cycle. */
export const MOOSE_CYCLE = 160;
/** The first visit starts this far into the clock, after the deer's first, so the two don't arrive together. */
export const MOOSE_FIRST = 24;
export const MOOSE_WALK_IN_SEC = 12;
export const MOOSE_FEED_SEC = 22;
export const MOOSE_STEP_SEC = 6;
export const MOOSE_WALK_OUT_SEC = 14;
/** Each feed: the head goes under for a few seconds, then comes up to chew. */
export const MOOSE_DIP_SEC = 4.5;
export const MOOSE_CHEW_SEC = 3;
/** How deep it stands once out in the water: belly-deep, as moose feed. */
export const MOOSE_WADE_Y = -0.85;
/** A fresh cast landing closer than this sends it off, at a heavy trot this long. */
export const MOOSE_SCARE_RADIUS = 9;
export const MOOSE_SPLASH_FRESH_SEC = 0.6;
export const MOOSE_TROT_SEC = 5;

/** Out at dawn and dusk from spring to fall, but not in the rain. */
export function mooseOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  return (hour === "dawn" || hour === "dusk") && sky !== "rain" && season !== "winter";
}

/** A bull carries his antlers from summer into fall; they are only growing in spring. */
export function mooseAntlers(season: LakeSeason) {
  return season === "summer" || season === "fall";
}

export type MooseState = { mode: "visiting" } | { mode: "fled"; since: number; visit: number; from: { x: number; z: number } };

export type MoosePose = {
  x: number;
  y: number;
  z: number;
  /** Heading, as the yaw a +z-facing model needs. */
  yaw: number;
  /** Head down: 0 up to 1 under the water. */
  head: number;
  /** Leg swing phase in radians; 0 while it stands. */
  gait: number;
  hidden: boolean;
  /** The ring where the head went in or came out, 0..1 as it spreads; -1 when there is none. */
  ring: number;
};

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

function ease(k: number) {
  return k * k * (3 - 2 * k);
}

function headingTo(from: { x: number; z: number }, to: { x: number; z: number }) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** Standing height: on the bank at the trees, down to belly-deep a few meters into the water. */
export function mooseY(x: number, z: number) {
  return MOOSE_WADE_Y * ease(Math.min(1, shoreInland(x, z) / 0.12));
}

/** Which visit `time` falls in, and how far into it. */
export function mooseVisit(time: number) {
  const shifted = time - MOOSE_FIRST;
  const visit = Math.floor(shifted / MOOSE_CYCLE);
  return { visit, into: shifted - visit * MOOSE_CYCLE };
}

const AWAY: MoosePose = { ...MOOSE_WOODS, y: 0, yaw: 0, head: 0, gait: 0, hidden: true, ring: -1 };

function walking(from: { x: number; z: number }, to: { x: number; z: number }, t: number, sec: number, still: boolean): MoosePose {
  const k = ease(Math.min(1, t / sec));
  const x = lerp(from.x, to.x, k);
  const z = lerp(from.z, to.z, k);
  return { x, y: mooseY(x, z), z, yaw: headingTo(from, to), head: 0, gait: still ? 0 : t * 4.2, hidden: false, ring: -1 };
}

function feeding(at: { x: number; z: number }, yaw: number, t: number): MoosePose {
  const beat = MOOSE_DIP_SEC + MOOSE_CHEW_SEC;
  const into = t % beat;
  // Lowers into the water over a second, stays under, then lifts out over a second to chew.
  const head = into < MOOSE_DIP_SEC ? ease(Math.min(1, into, MOOSE_DIP_SEC - into)) : 0;
  // A ring spreads from the muzzle as it goes in and again as it comes out.
  const ring = into < 1.6 ? into / 1.6 : into >= MOOSE_DIP_SEC - 0.4 && into < MOOSE_DIP_SEC + 1.2 ? (into - (MOOSE_DIP_SEC - 0.4)) / 1.6 : -1;
  return { ...at, y: mooseY(at.x, at.z), yaw, head, gait: 0, hidden: false, ring };
}

/** The moose at `time` on an undisturbed visit. `still` keeps it standing at its first patch, head up, for reduced motion. */
function visitPose(time: number, still: boolean): MoosePose {
  const { into } = mooseVisit(time);
  const inYaw = headingTo(MOOSE_WOODS, MOOSE_FEED_A);
  if (into < 0) return AWAY;
  if (still) return into < MOOSE_WALK_IN_SEC + 2 * MOOSE_FEED_SEC + MOOSE_STEP_SEC + MOOSE_WALK_OUT_SEC ? { ...MOOSE_FEED_A, y: mooseY(MOOSE_FEED_A.x, MOOSE_FEED_A.z), yaw: inYaw, head: 0, gait: 0, hidden: false, ring: -1 } : AWAY;
  let t = into;
  if (t < MOOSE_WALK_IN_SEC) return walking(MOOSE_WOODS, MOOSE_FEED_A, t, MOOSE_WALK_IN_SEC, false);
  t -= MOOSE_WALK_IN_SEC;
  if (t < MOOSE_FEED_SEC) return feeding(MOOSE_FEED_A, inYaw, t);
  t -= MOOSE_FEED_SEC;
  if (t < MOOSE_STEP_SEC) return walking(MOOSE_FEED_A, MOOSE_FEED_B, t, MOOSE_STEP_SEC, false);
  t -= MOOSE_STEP_SEC;
  if (t < MOOSE_FEED_SEC) return feeding(MOOSE_FEED_B, headingTo(MOOSE_FEED_A, MOOSE_FEED_B), t);
  t -= MOOSE_FEED_SEC;
  if (t < MOOSE_WALK_OUT_SEC) return walking(MOOSE_FEED_B, MOOSE_WOODS, t, MOOSE_WALK_OUT_SEC, false);
  return AWAY;
}

export function stepMoose(state: MooseState, time: number, splash: Splash, still = false): MooseState {
  const { visit } = mooseVisit(time);
  if (state.mode === "fled") return visit > state.visit ? { mode: "visiting" } : state;
  const pose = visitPose(time, still);
  if (pose.hidden) return state;
  const fresh = time - splash.at >= 0 && time - splash.at < MOOSE_SPLASH_FRESH_SEC;
  if (fresh && Math.hypot(pose.x - splash.x, pose.z - splash.z) < MOOSE_SCARE_RADIUS) return { mode: "fled", since: time, visit, from: { x: pose.x, z: pose.z } };
  return state;
}

/** The moose at `time`. */
export function moosePose(time: number, state: MooseState = { mode: "visiting" }, still = false): MoosePose {
  if (state.mode === "visiting") return visitPose(time, still);
  const since = time - state.since;
  if (since >= MOOSE_TROT_SEC) return AWAY;
  // Head up at once and off at a heavy trot, quick at first.
  const k = 1 - (1 - since / MOOSE_TROT_SEC) ** 2;
  const x = lerp(state.from.x, MOOSE_WOODS.x, k);
  const z = lerp(state.from.z, MOOSE_WOODS.z, k);
  return { x, y: mooseY(x, z), z, yaw: headingTo(state.from, MOOSE_WOODS), head: 0, gait: still ? 0 : since * 9, hidden: false, ring: -1 };
}
