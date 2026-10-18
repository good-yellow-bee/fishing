import type { LakeHour, Sky } from "@stillwater/shared";
import { DOCK_POST_CAPS } from "./snowyDock";

/**
 * A robin that drops in on the dock: it flies in low over the water to the front-left post, cocks
 * its head this way and that and flicks its tail, flits across to the front-right post for a
 * while, and flies off again over the lake. It comes every minute or so, from dawn through the
 * day, in every season but not in the rain. Pure in time.
 */

type Point = { x: number; y: number; z: number };

/** The two front posts, on the lake side of the dock. */
const front = DOCK_POST_CAPS.filter((cap) => cap.z === Math.min(...DOCK_POST_CAPS.map((c) => c.z)));
const LEFT = front.reduce((a, b) => (a.x < b.x ? a : b));
const RIGHT = front.reduce((a, b) => (a.x > b.x ? a : b));
/** The snow cap on each post in winter lifts the bird by this much. */
export const SNOW_CAP = 0.06;
/** Where it comes from and goes to, low over the water out to either side. */
const FROM: Point = { x: LEFT.x - 7, y: 2.2, z: LEFT.z - 5 };
const TO: Point = { x: RIGHT.x + 7, y: 2.6, z: RIGHT.z - 6 };
/** One visit, and its parts: flying in, on the left post, flitting across, on the right post, flying off. */
export const VISIT_EVERY_SEC = 70;
const IN_SEC = 1.8;
const LEFT_SEC = 8;
const FLIT_SEC = 0.6;
const RIGHT_SEC = 7;
const OUT_SEC = 1.8;
export const VISIT_SEC = IN_SEC + LEFT_SEC + FLIT_SEC + RIGHT_SEC + OUT_SEC;
/** It first comes a little after you arrive. */
const FIRST_SEC = 8;

/** About from dawn through the day, in every season, but not in the rain. */
export function robinOut(hour: LakeHour, sky: Sky | undefined) {
  return (hour === "dawn" || hour === "day") && sky !== "rain";
}

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function lerp(a: Point, b: Point, t: number, arc: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + arc * Math.sin(Math.PI * t), z: a.z + (b.z - a.z) * t };
}

export type RobinPose = Point & {
  /** Whether it is about at all. */
  here: boolean;
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** In flight, wings beating, 0 or 1. */
  flying: number;
  /** The head turned off straight ahead, in radians. */
  look: number;
  /** The tail flicked up, 0 to 1. */
  flick: number;
};

/** Facing the angler, back up the dock, as it perches. */
const PERCH_YAW = 0;

/** The robin `time` seconds in. `snow` lifts it onto the posts' snow caps; `still` keeps it perched on the left post. */
export function robinAt(time: number, snow = false, still = false): RobinPose {
  const lift = snow ? SNOW_CAP : 0;
  const left = { x: LEFT.x, y: LEFT.y + lift, z: LEFT.z };
  const right = { x: RIGHT.x, y: RIGHT.y + lift, z: RIGHT.z };
  if (still) return { ...left, here: true, yaw: PERCH_YAW, flying: 0, look: 0, flick: 0 };
  const t = time - FIRST_SEC;
  const into = ((t % VISIT_EVERY_SEC) + VISIT_EVERY_SEC) % VISIT_EVERY_SEC;
  if (t < 0 || into >= VISIT_SEC) return { ...left, here: false, yaw: PERCH_YAW, flying: 0, look: 0, flick: 0 };
  const onLeft = IN_SEC;
  const flit = onLeft + LEFT_SEC;
  const onRight = flit + FLIT_SEC;
  const off = onRight + RIGHT_SEC;
  const heading = (a: Point, b: Point) => Math.atan2(b.x - a.x, b.z - a.z);
  // Head cocked this way and that in quick turns, with still moments between; the tail flicks now and then.
  const look = 0.7 * Math.sin(Math.round(into / 0.9) * 2.3) * (into > onLeft && into < off ? 1 : 0);
  const flick = Math.max(0, Math.sin(into * 2.1) ** 12);
  if (into < onLeft) {
    const p = smooth(into / IN_SEC);
    return { ...lerp(FROM, left, p, 0.3), here: true, yaw: p > 0.92 ? PERCH_YAW : heading(FROM, left), flying: 1, look: 0, flick: 0 };
  }
  if (into < flit) return { ...left, here: true, yaw: PERCH_YAW, flying: 0, look, flick };
  if (into < onRight) {
    const p = smooth((into - flit) / FLIT_SEC);
    return { ...lerp(left, right, p, 0.25), here: true, yaw: heading(left, right), flying: 1, look: 0, flick: 0 };
  }
  if (into < off) return { ...right, here: true, yaw: PERCH_YAW, flying: 0, look, flick };
  const p = smooth((into - off) / OUT_SEC);
  return { ...lerp(right, TO, p, 0.4), here: true, yaw: heading(right, TO), flying: 1, look: 0, flick: 0 };
}
