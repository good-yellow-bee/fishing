import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { snowing } from "./capSnow";
import { MOTH_LAMPS, MOTHS_PER_LANTERN, mothAt } from "./mothOrbit";
import { SNOW_CAP } from "./robinVisit";
import { STARTLE_TURN_SEC, turnBetween, visitAt } from "./visitClock";
import { DOCK_POST_CAPS } from "./snowyDock";

/**
 * A little owl on the dock at night: every so often it glides in low and silent over the water,
 * a few soft wingbeats then a long glide, and lands on the dock's front-left post in the lanterns'
 * light. There it bobs its head up and down the way little owls do when something takes their
 * interest, swivels its head right round to look behind it and back, and blinks, before dropping
 * off the post and gliding away low over the lake. When moths are about the lantern beside it, it
 * spends spells following one round with its head. A strike on the dock startles it off its post early.
 * Any season, not in the rain, though it comes in the snow. Pure in time.
 */

type Point = { x: number; y: number; z: number };

/** Out at night, in every season; not in the rain, but it comes in winter's snow. */
export function littleOwlOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "night" && (sky !== "rain" || snowing(sky, season));
}

/** The front-left post, the one nearest the lake on the angler's left. */
const front = DOCK_POST_CAPS.filter((cap) => cap.z === Math.min(...DOCK_POST_CAPS.map((c) => c.z)));
const LEFT_POST = front.reduce((a, b) => (a.x < b.x ? a : b));
/** On the outer half of its cap, clear of the lantern on the inner side, so it shows from behind the angler. */
export const OWL_POST = { ...LEFT_POST, x: LEFT_POST.x - 0.08 };
/** Where it glides in from and off to, low over the water out on either side. */
const FROM: Point = { x: OWL_POST.x - 8, y: 1.6, z: OWL_POST.z - 6 };
const TO: Point = { x: OWL_POST.x + 9, y: 1.2, z: OWL_POST.z - 7 };
/** A visit every so often, the first a little after you arrive. */
export const VISIT_EVERY_SEC = 85;
const FIRST_SEC = 10;
export const IN_SEC = 2.6;
export const SIT_SEC = 18;
export const OUT_SEC = 2.8;
export const VISIT_SEC = IN_SEC + SIT_SEC + OUT_SEC;
/** How far round it turns its head, either way: well past its shoulder. */
export const LOOK_MAX = 1.9;

export type OwlPose = Point & {
  here: boolean;
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** In the air, 0 or 1, and how hard its wings beat, 0 gliding to 1. */
  flying: number;
  flap: number;
  /** Its head turned off straight ahead, radians. */
  look: number;
  /** Its head bobbing down and up, 0 to 1. */
  bob: number;
  /** Eyes shut, 0 or 1. */
  blink: number;
};

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function glide(a: Point, b: Point, t: number, dip: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - dip * Math.sin(Math.PI * t), z: a.z + (b.z - a.z) * t };
}

/** Facing back up the dock, turned a touch toward the angler, as it perches. */
const PERCH_YAW = 0.25;

/** Every so long on the post it picks out a moth round its lantern and follows it for a spell. */
export const WATCH_EVERY_SEC = 9;
export const WATCH_FROM_SEC = 3;
export const WATCH_SEC = 5;

/** The lantern on its own post, whose moths it watches. */
export const OWL_LAMP = MOTH_LAMPS.reduce((a, b) => (Math.hypot(a.x - OWL_POST.x, a.z - OWL_POST.z) < Math.hypot(b.x - OWL_POST.x, b.z - OWL_POST.z) ? a : b));
const LAMP_MOTH = MOTH_LAMPS.indexOf(OWL_LAMP) * MOTHS_PER_LANTERN;
/** Closer than this a moth is on top of it, too close to follow. */
const TOO_CLOSE = 0.1;

/** The head turn, off its perching yaw, that looks at the point (`x`, `z`) from the post; null past LOOK_MAX. */
export function owlLookAt(x: number, z: number) {
  const raw = Math.atan2(x - OWL_POST.x, z - OWL_POST.z) - PERCH_YAW;
  const rel = Math.atan2(Math.sin(raw), Math.cos(raw));
  return Math.abs(rel) > LOOK_MAX ? null : rel;
}

/**
 * Its look `sit` seconds onto the post during a spell watching a moth round its lantern, or null outside one.
 * When the moth swings behind it or right up to it, it looks back at the lantern for it to come round again.
 */
export function owlWatchLook(sit: number, time: number) {
  const spell = sit % WATCH_EVERY_SEC;
  if (spell < WATCH_FROM_SEC || spell >= WATCH_FROM_SEC + WATCH_SEC) return null;
  const moth = mothAt(LAMP_MOTH + (Math.floor(sit / WATCH_EVERY_SEC) % MOTHS_PER_LANTERN), time);
  const near = Math.hypot(moth.x - OWL_POST.x, moth.z - OWL_POST.z) < TOO_CLOSE;
  return (near ? null : owlLookAt(moth.x, moth.z)) ?? owlLookAt(OWL_LAMP.x, OWL_LAMP.z)!;
}

/** Which visit `time` falls in, counting from 0, and how far into it; a negative visit before the first. */
export const owlVisit = (time: number) => visitAt(time, FIRST_SEC, VISIT_EVERY_SEC);
export const owlVisitIndex = (time: number) => owlVisit(time).index;

/**
 * The owl `time` seconds in. `snow` lifts it onto the post's snow cap; `still` keeps it sat on the post;
 * `moths` when moths circle the lanterns (mothOrbit.ts); `startledAt`, when the angler last struck.
 */
export function owlAt(time: number, snow = false, still = false, moths = false, startledAt = -Infinity): OwlPose {
  const post = { x: OWL_POST.x, y: OWL_POST.y + (snow ? SNOW_CAP : 0), z: OWL_POST.z };
  const sat: OwlPose = { ...post, here: true, yaw: PERCH_YAW, flying: 0, flap: 0, look: 0, bob: 0, blink: 0 };
  if (still) return sat;
  const { index, into } = owlVisit(time);
  if (index < 0 || into >= VISIT_SEC) return { ...sat, here: false };
  const heading = (a: Point, b: Point) => Math.atan2(b.x - a.x, b.z - a.z);
  if (into < IN_SEC) {
    const p = smooth(into / IN_SEC);
    // A few soft beats as it sets off, then a long glide in, a beat or two to brake onto the post.
    const flap = into < 0.8 || into > IN_SEC - 0.4 ? 1 : 0;
    return { ...glide(FROM, post, p, 0.5), here: true, yaw: p > 0.94 ? PERCH_YAW : heading(FROM, post), flying: 1, flap, look: 0, bob: 0, blink: 0 };
  }
  const sit = into - IN_SEC;
  // Startled while it sat, or while it glided in, as it lands: it beats off its post at once, and is gone until its next visit.
  const strike = owlVisit(startledAt);
  const startle = strike.index === index ? Math.max(0, strike.into - IN_SEC) : Infinity;
  if (startle < SIT_SEC && sit >= startle) {
    const away = sit - startle;
    if (away >= OUT_SEC) return { ...sat, here: false };
    // A quick swing round toward where it flies, its head coming back straight.
    const turn = away / STARTLE_TURN_SEC;
    const was = owlAt(time - away, snow, false, moths);
    return {
      ...glide(post, TO, smooth(away / OUT_SEC), 0.3),
      here: true,
      yaw: turnBetween(PERCH_YAW, heading(post, TO), turn),
      flying: 1,
      flap: 1,
      look: was.look * Math.max(0, 1 - turn),
      bob: 0,
      blink: 0,
    };
  }
  if (sit < SIT_SEC) {
    // Slow swivels right round and back, with still spells between; a run of bobs when something catches its eye.
    const swivel = Math.sin(sit * 0.45) * Math.sin(sit * 0.17 + 0.6);
    const look = LOOK_MAX * Math.max(-1, Math.min(1, swivel * 1.6));
    const bobbing = sit % 7 < 1.6 ? Math.max(0, Math.sin((sit % 7) * Math.PI * 2.5)) : 0;
    const blink = sit % 5.3 < 0.18 ? 1 : 0;
    const watch = moths ? owlWatchLook(sit, time) : null;
    if (watch !== null) {
      // A bob or two as it first fixes on the moth.
      const fix = (sit % WATCH_EVERY_SEC) - WATCH_FROM_SEC;
      return { ...sat, look: watch, bob: fix < 0.8 ? Math.max(0, Math.sin(fix * Math.PI * 2.5)) : 0, blink };
    }
    return { ...sat, look, bob: bobbing, blink };
  }
  const p = smooth((sit - SIT_SEC) / OUT_SEC);
  // It drops off the post, then glides away low over the water.
  return { ...glide(post, TO, p, 0.55), here: true, yaw: heading(post, TO), flying: 1, flap: sit - SIT_SEC < 0.6 ? 1 : 0, look: 0, bob: 0, blink: 0 };
}
