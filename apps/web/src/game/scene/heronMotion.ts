import type { LakeHour, Sky as WeatherSky } from "@stillwater/shared";

/**
 * A grey heron that works the west reed shallows by day. It wades slowly
 * between two ends of the bed's lake-side edge, stops to watch the water and
 * stabs now and then. When the angler comes close it lifts off over the lake
 * and stays away until they have gone.
 */

/** The two ends of the heron's beat, on the reed bed's lake side, ankle-deep. */
export const HERON_BEAT = { a: { x: -10.3, z: 3.6 }, b: { x: -11.4, z: 0.6 } } as const;
/** Walking closer than this to the heron sends it up. */
export const HERON_FLEE_RADIUS = 6.5;
/** It comes back once the angler is this far away (more than the flee radius, so it does not flicker). */
export const HERON_RETURN_RADIUS = 9;
/** Seconds it stays away before it may come back. */
export const HERON_AWAY_SEC = 45;
/** Seconds of flight, from lift-off to out of sight. */
export const HERON_FLIGHT_SEC = 7;
/** Seconds to walk one way along the beat, and how long each stop lasts. */
const WALK_SEC = 26;
const STOP_SEC = 9;
/** Where it flies to: east across the lake and up over the far trees. */
const FLIGHT_TO = { x: 14, y: 9, z: -24 };

/** Out by day; it shelters at night and in rain. */
export function heronOut(hour: LakeHour, sky: WeatherSky) {
  return hour !== "night" && sky !== "rain";
}

export type HeronPose = {
  x: number;
  y: number;
  z: number;
  /** Facing, radians about +y, 0 along +z. */
  yaw: number;
  /** 0 standing tall, 1 at the bottom of a stab. */
  stab: number;
  /** 0 folded, swinging -1..1 while flying. */
  wing: number;
  flying: boolean;
};

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Wading along the beat at `time`: walk a leg, stop and watch (with a quick stab
 * partway through), walk back. `still` keeps it standing at the first end for
 * reduced motion.
 */
export function heronWade(time: number, still = false): HeronPose {
  const { a, b } = HERON_BEAT;
  const legYaw = Math.atan2(b.x - a.x, b.z - a.z);
  if (still) return { x: a.x, y: 0, z: a.z, yaw: legYaw, stab: 0, wing: 0, flying: false };
  const cycle = 2 * (WALK_SEC + STOP_SEC);
  const t = ((time % cycle) + cycle) % cycle;
  const outbound = t < WALK_SEC + STOP_SEC;
  const leg = outbound ? t : t - (WALK_SEC + STOP_SEC);
  const walking = leg < WALK_SEC;
  // Herons walk in slow, deliberate steps: progress eases in and out of each step.
  const steps = 13;
  const raw = walking ? leg / WALK_SEC : 1;
  const stepped = (Math.floor(raw * steps) + smooth((raw * steps) % 1)) / steps;
  const along = outbound ? Math.min(1, stepped) : 1 - Math.min(1, stepped);
  const yaw = outbound ? legYaw : legYaw + Math.PI;
  // A stop: watch, then one stab about two thirds through.
  const stopAge = walking ? -1 : leg - WALK_SEC;
  const stabAt = STOP_SEC * 0.62;
  const stab = stopAge < 0 ? 0 : Math.max(0, 1 - Math.abs(stopAge - stabAt) / 0.35);
  return { x: a.x + (b.x - a.x) * along, y: 0, z: a.z + (b.z - a.z) * along, yaw, stab, wing: 0, flying: false };
}

/** The heron `age` seconds after lifting off from `from`; null once it is out of sight. */
export function heronFlight(age: number, from: { x: number; z: number }): HeronPose | null {
  if (age >= HERON_FLIGHT_SEC) return null;
  const k = age / HERON_FLIGHT_SEC;
  // Slow labouring climb first, then a long glide out.
  const climb = smooth(Math.min(1, age / 2.2));
  const x = from.x + (FLIGHT_TO.x - from.x) * k;
  const z = from.z + (FLIGHT_TO.z - from.z) * k;
  const y = 0.2 + climb * 2.2 + k * k * (FLIGHT_TO.y - 2.4);
  const yaw = Math.atan2(FLIGHT_TO.x - from.x, FLIGHT_TO.z - from.z);
  // Deep, slow wingbeats: about 2.2 a second while climbing, slower once up.
  const rate = age < 2.2 ? 2.2 : 1.5;
  return { x, y, z, yaw, stab: 0, wing: Math.sin(age * rate * Math.PI * 2), flying: true };
}

export type HeronState =
  | { mode: "wading" }
  | { mode: "flying"; since: number; from: { x: number; z: number } }
  | { mode: "away"; since: number }
  | { mode: "landing"; since: number };

/** Gliding back in to the beat: the lift-off flight run backwards, ending where it will wade. */
export function heronLanding(age: number, to: { x: number; z: number }): HeronPose | null {
  const pose = heronFlight(HERON_FLIGHT_SEC - age, to);
  if (!pose || age < 0) return null;
  // Facing the way it is going: back toward the reeds.
  return { ...pose, yaw: pose.yaw + Math.PI };
}

/** Moves the heron's state on: flee when the angler comes close, come back once they have gone. */
export function stepHeron(state: HeronState, time: number, angler: { x: number; z: number }, wading: HeronPose): HeronState {
  if (state.mode === "wading") {
    if (Math.hypot(angler.x - wading.x, angler.z - wading.z) < HERON_FLEE_RADIUS) {
      return { mode: "flying", since: time, from: { x: wading.x, z: wading.z } };
    }
    return state;
  }
  if (state.mode === "flying") {
    return time - state.since >= HERON_FLIGHT_SEC ? { mode: "away", since: state.since + HERON_FLIGHT_SEC } : state;
  }
  const far = Math.hypot(angler.x - wading.x, angler.z - wading.z) > HERON_RETURN_RADIUS;
  if (state.mode === "landing") {
    // Spooked on the way in: turn round from where it is in the air, not from the reeds.
    if (!far) return { mode: "flying", since: time - (HERON_FLIGHT_SEC - (time - state.since)), from: { x: wading.x, z: wading.z } };
    return time - state.since >= HERON_FLIGHT_SEC ? { mode: "wading" } : state;
  }
  return time - state.since >= HERON_AWAY_SEC && far ? { mode: "landing", since: time } : state;
}
