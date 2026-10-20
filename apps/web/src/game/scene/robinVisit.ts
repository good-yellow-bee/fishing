import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { snowing } from "./capSnow";
import { DOCK_POST_CAPS } from "./snowyDock";
import { STARTLE_TURN_SEC, turnBetween, visitAt } from "./visitClock";

/**
 * A robin that drops in on the dock: it flies in low over the water to the front-left post, cocks
 * its head this way and that and flicks its tail, flits across to the front-right post for a
 * while, and flies off again over the lake. It comes every minute or so, from dawn through the
 * day in every season, and into dusk in winter; not in the rain, but it comes in the snow. A strike on the dock startles it off early. Pure in time.
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

/** About from dawn through the day, in every season, and on into dusk in winter, the last bird to roost; not in the rain, though it comes in winter's snow. */
export function robinOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dawn" || hour === "day" || (hour === "dusk" && season === "winter")) && (sky !== "rain" || snowing(sky, season));
}

/** The blackbird is out on the bank on wet days instead, when the rain brings the worms up: dawn and day, rain that isn't snow, and not in a thunderstorm. */
export function blackbirdOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, storm = false) {
  return (hour === "dawn" || hour === "day") && sky === "rain" && !snowing(sky, season) && !storm;
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

/** Which visit `time` falls in, counting from 0, and how far into it; a negative visit before the first. */
export const robinVisit = (time: number) => visitAt(time, FIRST_SEC, VISIT_EVERY_SEC);
export const robinVisitIndex = (time: number) => robinVisit(time).index;

/**
 * The robin `time` seconds in. `snow` lifts it onto the posts' snow caps; `still` keeps it perched on the left post;
 * `startledAt`, when the angler last struck.
 */
export function robinAt(time: number, snow = false, still = false, startledAt = -Infinity): RobinPose {
  const lift = snow ? SNOW_CAP : 0;
  const left = { x: LEFT.x, y: LEFT.y + lift, z: LEFT.z };
  const right = { x: RIGHT.x, y: RIGHT.y + lift, z: RIGHT.z };
  if (still) return { ...left, here: true, yaw: PERCH_YAW, flying: 0, look: 0, flick: 0 };
  const { index, into } = robinVisit(time);
  if (index < 0 || into >= VISIT_SEC) return { ...left, here: false, yaw: PERCH_YAW, flying: 0, look: 0, flick: 0 };
  const onLeft = IN_SEC;
  const flit = onLeft + LEFT_SEC;
  const onRight = flit + FLIT_SEC;
  const off = onRight + RIGHT_SEC;
  const heading = (a: Point, b: Point) => Math.atan2(b.x - a.x, b.z - a.z);
  // Startled after it landed, or as it lands if struck while flying in: it flies off from where it was, gone until its next visit.
  const strike = robinVisit(startledAt);
  const startle = strike.index === index && strike.into < off ? Math.max(onLeft, strike.into) : Infinity;
  if (into >= startle) {
    const away = into - startle;
    if (away >= OUT_SEC) return { ...left, here: false, yaw: PERCH_YAW, flying: 0, look: 0, flick: 0 };
    const from = robinAt(time - away, snow);
    const p = smooth(away / OUT_SEC);
    // A quick swing round toward where it flies, its head coming back straight.
    const turn = away / STARTLE_TURN_SEC;
    return { ...lerp(from, TO, p, 0.4), here: true, yaw: turnBetween(from.yaw, heading(from, TO), turn), flying: 1, look: from.look * Math.max(0, 1 - turn), flick: 0 };
  }
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
