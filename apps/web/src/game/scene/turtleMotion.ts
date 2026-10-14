import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import type { Splash } from "./duckFlush";

/**
 * A turtle basking on a half-sunk log off the west bank. It sits with its
 * neck out, now and then stretching it; a cast landing close sends it sliding
 * off into the water, and it climbs back out a while later. Pure functions of
 * time, like the otter.
 */

/** The log's middle, its length, and which way it lies (radians round from +x). */
export const BASKING_LOG = { x: -6.4, z: 2.4, length: 2.6, yaw: 0.5 } as const;
/** Where on the log the turtle sits, measured along it from the middle, and how high its shell rides. */
export const TURTLE_SPOT = 0.45;
export const TURTLE_Y = 0.2;
/** Seconds between neck stretches, and how long one takes. */
export const STRETCH_GAP = 9;
export const STRETCH_SEC = 2.4;
/** A cast landing closer than this sends it in; only a fresh splash counts. */
export const TURTLE_SCARE_RADIUS = 4.5;
export const TURTLE_SPLASH_FRESH_SEC = 0.6;
/** The slide in, the time away, and the climb back out. */
export const SLIDE_SEC = 0.7;
export const AWAY_SEC = 45;
export const CLIMB_SEC = 2.5;

/** Basks on warm, bright summer days; cloud, rain and the cold keep it under. */
export function turtleOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  return season === "summer" && hour === "day" && (sky === "clear" || sky === "partly-cloudy");
}

export type TurtleState = { mode: "basking" } | { mode: "under"; since: number };

export type TurtlePose = {
  x: number;
  y: number;
  z: number;
  /** Facing down the log toward the water. */
  yaw: number;
  /** Head out: 0 tucked to 1 at full stretch. */
  neck: number;
  hidden: boolean;
  /** The ring where it went in or came out, 0..1 as it spreads; -1 when there is none. */
  ring: number;
};

/** Where it sits on the log. */
export function turtleSeat() {
  const dx = Math.cos(BASKING_LOG.yaw) * TURTLE_SPOT;
  const dz = -Math.sin(BASKING_LOG.yaw) * TURTLE_SPOT;
  return { x: BASKING_LOG.x + dx, z: BASKING_LOG.z + dz };
}

/** The water off the log's end, where it slides in and climbs out. */
export function turtleEntry() {
  const reach = BASKING_LOG.length / 2 + 0.4;
  return { x: BASKING_LOG.x + Math.cos(BASKING_LOG.yaw) * reach, z: BASKING_LOG.z - Math.sin(BASKING_LOG.yaw) * reach };
}

/** Facing along the log toward its sunk end, the yaw a +z-facing model needs. */
const FACING = Math.atan2(Math.cos(BASKING_LOG.yaw), -Math.sin(BASKING_LOG.yaw));

export function stepTurtle(state: TurtleState, time: number, splash: Splash): TurtleState {
  if (state.mode === "under") return time - state.since >= SLIDE_SEC + AWAY_SEC + CLIMB_SEC ? { mode: "basking" } : state;
  const fresh = time - splash.at >= 0 && time - splash.at < TURTLE_SPLASH_FRESH_SEC;
  const seat = turtleSeat();
  if (fresh && Math.hypot(seat.x - splash.x, seat.z - splash.z) < TURTLE_SCARE_RADIUS) return { mode: "under", since: time };
  return state;
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

/** The turtle at `time`. `still` holds its neck out without stretching, for reduced motion. */
export function turtlePose(time: number, state: TurtleState = { mode: "basking" }, still = false): TurtlePose {
  const seat = turtleSeat();
  const entry = turtleEntry();
  if (state.mode === "under") {
    const since = time - state.since;
    if (since < SLIDE_SEC) {
      const k = (since / SLIDE_SEC) ** 2;
      return { x: lerp(seat.x, entry.x, k), y: lerp(TURTLE_Y, -0.15, k), z: lerp(seat.z, entry.z, k), yaw: FACING, neck: 0, hidden: false, ring: -1 };
    }
    const back = since - SLIDE_SEC - AWAY_SEC;
    const ringIn = since - SLIDE_SEC;
    if (back < 0) return { x: entry.x, y: -0.3, z: entry.z, yaw: FACING, neck: 0, hidden: true, ring: ringIn < 1.2 ? ringIn / 1.2 : -1 };
    // Out of the water and up the log, slow and careful.
    const k = Math.min(1, back / CLIMB_SEC);
    const e = k * k * (3 - 2 * k);
    return { x: lerp(entry.x, seat.x, e), y: lerp(-0.1, TURTLE_Y, e), z: lerp(entry.z, seat.z, e), yaw: FACING + Math.PI, neck: 0.5, hidden: false, ring: k < 0.4 ? k / 0.4 : -1 };
  }
  if (still) return { ...seat, y: TURTLE_Y, yaw: FACING, neck: 0.5, hidden: false, ring: -1 };
  const into = ((time % STRETCH_GAP) + STRETCH_GAP) % STRETCH_GAP;
  const stretch = into < STRETCH_SEC ? Math.sin((into / STRETCH_SEC) * Math.PI) : 0;
  return { ...seat, y: TURTLE_Y, yaw: FACING, neck: 0.5 + 0.5 * stretch, hidden: false, ring: -1 };
}
