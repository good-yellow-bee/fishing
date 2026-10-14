import type { LakeHour, Sky } from "@stillwater/shared";
import type { Splash } from "./duckFlush";

/**
 * A deer that comes down out of the far treeline to drink at dawn and dusk.
 * Each visit walks in, drinks with its head down (looking up now and then),
 * and walks back; a cast landing close sends it bounding off until the next
 * visit. Pure functions of time, like the turtle and the otter.
 */

/** Where it stands to drink, front hooves at the water's edge on the far bank, and where it comes out of the trees. */
export const DEER_DRINK = { x: 5.2, z: -15.4 } as const;
export const DEER_WOODS = { x: 7.2, z: -23 } as const;
/** One visit every cycle: the walk down, the drink, the walk back, then away in the trees. */
export const DEER_CYCLE = 75;
export const DEER_WALK_SEC = 7;
export const DEER_DRINK_SEC = 18;
/** The first visit starts this far into the clock, so the lake is empty when you arrive. */
export const DEER_FIRST = 6;
/** It turns side-on to the water to drink, by this much off its walk in. */
export const DEER_DRINK_TURN = 0.8;
/** Seconds between looks up while drinking, and how long a look lasts. */
export const DEER_LOOK_GAP = 5.5;
export const DEER_LOOK_SEC = 1.6;
/** A fresh cast landing closer than this sends it off, at a bound this long. */
export const DEER_SCARE_RADIUS = 7;
export const DEER_SPLASH_FRESH_SEC = 0.6;
export const DEER_BOUND_SEC = 1.8;
/** Drinking rings spread once every this many seconds. */
export const DEER_RING_SEC = 2;

/** Out at dawn and dusk, but not in rain. */
export function deerOut(hour: LakeHour, sky: Sky | undefined): boolean {
  return (hour === "dawn" || hour === "dusk") && sky !== "rain";
}

export type DeerState = { mode: "visiting" } | { mode: "fled"; since: number; visit: number; from: { x: number; z: number } };

export type DeerPose = {
  x: number;
  z: number;
  /** Heading, as the yaw a +z-facing model needs. */
  yaw: number;
  /** Head down: 0 up and alert to 1 at the water. */
  head: number;
  /** Leg swing phase in radians; constant while it stands. */
  gait: number;
  hidden: boolean;
  /** The drinking ring at its muzzle, 0..1 as it spreads; -1 when there is none. */
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

/** Which visit `time` falls in, and how far into it. */
export function deerVisit(time: number) {
  const shifted = time - DEER_FIRST;
  const visit = Math.floor(shifted / DEER_CYCLE);
  return { visit, into: shifted - visit * DEER_CYCLE };
}

/** The deer at `time` on an undisturbed visit. `still` keeps it standing with its head up, for reduced motion. */
function visitPose(time: number, still: boolean): DeerPose {
  const { into } = deerVisit(time);
  const away: DeerPose = { ...DEER_WOODS, yaw: 0, head: 0, gait: 0, hidden: true, ring: -1 };
  const walkStride = (t: number) => (still ? 0 : t * 7);
  if (into < 0) return away;
  if (into < DEER_WALK_SEC) {
    const k = ease(into / DEER_WALK_SEC);
    return { x: lerp(DEER_WOODS.x, DEER_DRINK.x, k), z: lerp(DEER_WOODS.z, DEER_DRINK.z, k), yaw: headingTo(DEER_WOODS, DEER_DRINK), head: 0, gait: walkStride(into), hidden: false, ring: -1 };
  }
  const drinking = into - DEER_WALK_SEC;
  if (drinking < DEER_DRINK_SEC) {
    const walkIn = headingTo(DEER_WOODS, DEER_DRINK);
    if (still) return { ...DEER_DRINK, yaw: walkIn + DEER_DRINK_TURN, head: 0, gait: 0, hidden: false, ring: -1 };
    // Turns and lowers its head over the first second, and lifts it and turns back for the last.
    const down = Math.min(1, drinking, DEER_DRINK_SEC - drinking);
    const yaw = walkIn + DEER_DRINK_TURN * ease(down);
    const look = drinking % DEER_LOOK_GAP;
    const up = look > DEER_LOOK_GAP - DEER_LOOK_SEC ? Math.sin(((look - (DEER_LOOK_GAP - DEER_LOOK_SEC)) / DEER_LOOK_SEC) * Math.PI) : 0;
    const head = ease(Math.max(0, down)) * (1 - up);
    const ring = head > 0.9 ? (drinking % DEER_RING_SEC) / DEER_RING_SEC : -1;
    return { ...DEER_DRINK, yaw, head, gait: 0, hidden: false, ring };
  }
  const leaving = drinking - DEER_DRINK_SEC;
  if (leaving < DEER_WALK_SEC) {
    const k = ease(leaving / DEER_WALK_SEC);
    return { x: lerp(DEER_DRINK.x, DEER_WOODS.x, k), z: lerp(DEER_DRINK.z, DEER_WOODS.z, k), yaw: headingTo(DEER_DRINK, DEER_WOODS), head: 0, gait: walkStride(leaving), hidden: false, ring: -1 };
  }
  return away;
}

export function stepDeer(state: DeerState, time: number, splash: Splash, still = false): DeerState {
  const { visit } = deerVisit(time);
  if (state.mode === "fled") return visit > state.visit ? { mode: "visiting" } : state;
  const pose = visitPose(time, still);
  if (pose.hidden) return state;
  const fresh = time - splash.at >= 0 && time - splash.at < DEER_SPLASH_FRESH_SEC;
  if (fresh && Math.hypot(pose.x - splash.x, pose.z - splash.z) < DEER_SCARE_RADIUS) return { mode: "fled", since: time, visit, from: { x: pose.x, z: pose.z } };
  return state;
}

/** The deer at `time`. */
export function deerPose(time: number, state: DeerState = { mode: "visiting" }, still = false): DeerPose {
  if (state.mode === "visiting") return visitPose(time, still);
  const since = time - state.since;
  if (since >= DEER_BOUND_SEC) return { ...DEER_WOODS, yaw: 0, head: 0, gait: 0, hidden: true, ring: -1 };
  // Off in a few long bounds, quick at first.
  const k = 1 - (1 - since / DEER_BOUND_SEC) ** 2;
  return {
    x: lerp(state.from.x, DEER_WOODS.x, k),
    z: lerp(state.from.z, DEER_WOODS.z, k),
    yaw: headingTo(state.from, DEER_WOODS),
    head: 0,
    gait: still ? 0 : since * 16,
    hidden: false,
    ring: -1,
  };
}
