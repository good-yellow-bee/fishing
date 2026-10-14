import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import type { Splash } from "./duckFlush";

/**
 * A kingfisher on a bare snag off the east bank: it sits, now and then drops
 * into the water after a fry and flies back up, and a cast landing close sends
 * it off downlake for a while. Pure functions of time, like the otter.
 */

/** The snag's tip, where it sits, and the height of the water under it. */
export const KINGFISHER_PERCH = { x: 5.6, y: 1.25, z: 0.6 } as const;
/** Seconds it sits between dives, at least and at most (hashed per dive). */
export const SIT_MIN = 7;
export const SIT_MAX = 14;
/** The dive: the drop, the moment under, and the flight back up to the snag. */
export const DROP_SEC = 0.35;
export const UNDER_SEC = 0.3;
export const BACK_SEC = 1.1;
/** How far out from the snag a dive lands. */
export const DIVE_REACH = 2.2;
/** A cast landing closer than this sends it off; only a fresh splash counts. */
export const KINGFISHER_SCARE_RADIUS = 5;
export const KINGFISHER_SPLASH_FRESH_SEC = 0.6;
/** Seconds flying off, away, and flying back in. */
export const FLEE_SEC = 2.5;
export const AWAY_SEC = 35;
export const RETURN_SEC = 2.5;
/** Where it flies off to: low and fast downlake, out of sight past the east point. */
const FLEE_TO = { x: 24, y: 3, z: -9 } as const;

/** Out from dawn to dusk outside winter, but not in rain or fog. */
export function kingfisherOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  return hour !== "night" && season !== "winter" && sky !== "rain" && sky !== "fog";
}

export type KingfisherState = { mode: "perched" } | { mode: "fled"; since: number };

export type KingfisherPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Nose down for the drop, level in flight, in radians. */
  pitch: number;
  /** 0 wings folded on the perch, 1 wings out flying. */
  flying: number;
  /** Out of sight: under the water, or away downlake. */
  hidden: boolean;
  /** The splash ring where it went in, 0..1 as it spreads; -1 when there is none. */
  ring: number;
  ringX: number;
  ringZ: number;
};

function hash(i: number) {
  const s = Math.sin(i * 73.1 + 11.7) * 43758.5453;
  return s - Math.floor(s);
}

const DIVE_SEC = DROP_SEC + UNDER_SEC + BACK_SEC;

/** The k-th dive: how long it sits first, and where it goes in. */
function dive(k: number) {
  const sit = SIT_MIN + hash(k) * (SIT_MAX - SIT_MIN);
  // Out over the open water in front of the snag, never back into the bank.
  const angle = Math.PI * (0.75 + hash(k + 0.5) * 0.5);
  const reach = DIVE_REACH * (0.6 + 0.4 * hash(k + 0.25));
  return { sit, x: KINGFISHER_PERCH.x + Math.cos(angle) * reach, z: KINGFISHER_PERCH.z + Math.sin(angle) * reach * 0.6 - reach * 0.4 };
}

/** Sit times add up dive by dive, so the k-th dive starts at a fixed time and the motion stays a pure function. */
const CYCLES = Array.from({ length: 64 }, (_, k) => dive(k).sit + DIVE_SEC);
const LOOP_SEC = CYCLES.reduce((sum, c) => sum + c, 0);

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

function smooth(k: number) {
  const t = Math.min(1, Math.max(0, k));
  return t * t * (3 - 2 * t);
}

const NO_RING = { ring: -1, ringX: 0, ringZ: 0 };
const PERCHED: KingfisherPose = { ...KINGFISHER_PERCH, yaw: -Math.PI / 2, pitch: 0, flying: 0, hidden: false, ...NO_RING };

/** A fresh splash close to the snag sends it off; after a while it comes back to sit. */
export function stepKingfisher(state: KingfisherState, time: number, splash: Splash): KingfisherState {
  if (state.mode === "fled") return time - state.since >= FLEE_SEC + AWAY_SEC + RETURN_SEC ? { mode: "perched" } : state;
  const fresh = time - splash.at >= 0 && time - splash.at < KINGFISHER_SPLASH_FRESH_SEC;
  if (fresh && Math.hypot(KINGFISHER_PERCH.x - splash.x, KINGFISHER_PERCH.z - splash.z) < KINGFISHER_SCARE_RADIUS) return { mode: "fled", since: time };
  return state;
}

function fledPose(since: number): KingfisherPose {
  const yawOut = Math.atan2(FLEE_TO.x - KINGFISHER_PERCH.x, FLEE_TO.z - KINGFISHER_PERCH.z);
  if (since < FLEE_SEC) {
    const k = smooth(since / FLEE_SEC);
    return { x: lerp(KINGFISHER_PERCH.x, FLEE_TO.x, k), y: lerp(KINGFISHER_PERCH.y, FLEE_TO.y, k) + Math.sin(k * Math.PI) * 0.6, z: lerp(KINGFISHER_PERCH.z, FLEE_TO.z, k), yaw: yawOut, pitch: 0, flying: 1, hidden: false, ...NO_RING };
  }
  const back = since - FLEE_SEC - AWAY_SEC;
  if (back < 0) return { ...FLEE_TO, yaw: yawOut, pitch: 0, flying: 1, hidden: true, ...NO_RING };
  const k = smooth(back / RETURN_SEC);
  return { x: lerp(FLEE_TO.x, KINGFISHER_PERCH.x, k), y: lerp(FLEE_TO.y, KINGFISHER_PERCH.y, k), z: lerp(FLEE_TO.z, KINGFISHER_PERCH.z, k), yaw: yawOut + Math.PI, pitch: 0, flying: 1 - smooth((back - RETURN_SEC * 0.85) / (RETURN_SEC * 0.15)), hidden: false, ...NO_RING };
}

/** The bird at `time`. `still` keeps it sitting on the snag, for reduced motion. */
export function kingfisherPose(time: number, state: KingfisherState = { mode: "perched" }, still = false): KingfisherPose {
  if (state.mode === "fled") return fledPose(time - state.since);
  if (still) return PERCHED;
  let into = ((time % LOOP_SEC) + LOOP_SEC) % LOOP_SEC;
  let k = 0;
  while (into >= CYCLES[k]!) {
    into -= CYCLES[k]!;
    k += 1;
  }
  const d = dive(k);
  if (into < d.sit) return PERCHED;
  const t = into - d.sit;
  const yawIn = Math.atan2(d.x - KINGFISHER_PERCH.x, d.z - KINGFISHER_PERCH.z);
  if (t < DROP_SEC) {
    // A steep, quickening drop, beak first.
    const u = t / DROP_SEC;
    const e = u * u;
    return { x: lerp(KINGFISHER_PERCH.x, d.x, e), y: lerp(KINGFISHER_PERCH.y, 0, e), z: lerp(KINGFISHER_PERCH.z, d.z, e), yaw: yawIn, pitch: -1.2, flying: 0.5, hidden: false, ...NO_RING };
  }
  if (t < DROP_SEC + UNDER_SEC) {
    const u = (t - DROP_SEC) / UNDER_SEC;
    return { x: d.x, y: -0.2, z: d.z, yaw: yawIn, pitch: -1.2, flying: 0, hidden: true, ring: u * 0.5, ringX: d.x, ringZ: d.z };
  }
  // Out of the water and back up to the snag in a low arc, wings going.
  const u = (t - DROP_SEC - UNDER_SEC) / BACK_SEC;
  const e = smooth(u);
  return {
    x: lerp(d.x, KINGFISHER_PERCH.x, e),
    y: lerp(0.05, KINGFISHER_PERCH.y, e) + Math.sin(u * Math.PI) * 0.35,
    z: lerp(d.z, KINGFISHER_PERCH.z, e),
    yaw: yawIn + Math.PI,
    pitch: 0.4 * (1 - u),
    flying: 1 - smooth((u - 0.85) / 0.15),
    hidden: false,
    ring: u < 0.5 ? 0.5 + u : -1,
    ringX: d.x,
    ringZ: d.z,
  };
}
