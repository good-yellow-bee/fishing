import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * Swallows on the mooring line: on fine days from spring through summer, every so often three
 * swallows swoop in off the lake one after another and perch in a row on the rowboat's bow line,
 * riding its sway, bobbing their tails and turning their heads, then flick off again over the water
 * one by one. Only while the boat is tied up. Pure in time.
 */

/** Out by day in spring and summer, not in rain or fog. */
export function ropeSwallowsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && (season === "spring" || season === "summer") && sky !== "rain" && sky !== "fog";
}

/** Which mooring line they sit on (the bow line, the longer run, out over open water), and where along it, post (0) to hull (1). */
export const PERCH_ROPE = 0;
export const PERCH_SPOTS = [0.36, 0.5, 0.64] as const;
export const SWALLOW_COUNT = PERCH_SPOTS.length;
/** A visit every so often, the first a little after you arrive. */
export const VISIT_EVERY_SEC = 65;
const FIRST_SEC = 15;
/** Each comes in this long after the one before, and leaves in the same order. */
const STAGGER_SEC = 2.2;
/** How long the first sits; the others sit as long, from when they land. */
const SIT_SEC = 16;
/** Their swoop in, and their flight off. */
export const SWOOP_SEC = 1.1;
/** Where each comes in from and goes off to, from its perch: out over the water off the boat's side, and up. */
export const FROM = { x: 3.2, y: 1.2, z: -2.4 };
export const OFF = { x: 2.6, y: 1.6, z: 3 };
/** How high their feet sit above the rope's middle. */
export const PERCH_LIFT = 0.025;
export const VISIT_SEC = (SWALLOW_COUNT - 1) * STAGGER_SEC + SWOOP_SEC + SIT_SEC + SWOOP_SEC;

export type RopeSwallowPose = {
  here: boolean;
  /** Where along the rope it perches, 0 at the post to 1 at the hull. */
  along: number;
  /** Offset from its perch, while it swoops in or flies off. */
  x: number;
  y: number;
  z: number;
  /** Which way it faces, as a yaw for a model facing +z: in flight along its way, perched facing the camera. */
  yaw: number;
  /** Wingbeat, -1 to 1 in flight; 0 perched, wings folded. */
  flap: number;
  flying: boolean;
  /** Its tail bobbing on the rope, -1 to 1, and its head turned, in radians. */
  bob: number;
  look: number;
};

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Facing out of the screen, toward the angler's side of the lake, so its pale breast shows. */
const PERCH_YAW = 0;

function away(i: number): RopeSwallowPose {
  return { here: false, along: PERCH_SPOTS[i]!, x: FROM.x, y: FROM.y, z: FROM.z, yaw: 0, flap: 0, flying: true, bob: 0, look: 0 };
}

/** Swallow `i` at `time`. `still` keeps the row sat on the rope. */
export function ropeSwallowAt(i: number, time: number, still = false): RopeSwallowPose {
  const along = PERCH_SPOTS[i]!;
  if (still) return { here: true, along, x: 0, y: 0, z: 0, yaw: PERCH_YAW, flap: 0, flying: false, bob: 0, look: 0 };
  const since = time - FIRST_SEC;
  if (since < 0) return away(i);
  const t = (since % VISIT_EVERY_SEC) - i * STAGGER_SEC;
  if (t < 0 || t >= SWOOP_SEC + SIT_SEC + SWOOP_SEC) return away(i);
  if (t < SWOOP_SEC) {
    // In low over the water and up onto the rope, braking at the end.
    const k = smooth(t / SWOOP_SEC);
    const off = 1 - k;
    return {
      here: true,
      along,
      x: FROM.x * off,
      y: FROM.y * off * off - 0.25 * Math.sin(Math.PI * k) * off,
      z: FROM.z * off,
      yaw: Math.atan2(-FROM.x, -FROM.z),
      flap: Math.sin(t * 40),
      flying: true,
      bob: 0,
      look: 0,
    };
  }
  const sat = t - SWOOP_SEC;
  if (sat < SIT_SEC) {
    // A tail bob now and then, and a glance aside, each bird to its own beat.
    const beat = sat + i * 1.7;
    const bob = Math.max(0, Math.sin(beat * 2.3)) ** 6 * (Math.sin(beat * 30) > 0 ? 1 : -1);
    const look = 0.5 * Math.sin(beat * 0.9) * (Math.sin(beat * 0.31) > 0.2 ? 1 : 0);
    return { here: true, along, x: 0, y: 0, z: 0, yaw: PERCH_YAW, flap: 0, flying: false, bob, look };
  }
  const k = smooth((sat - SIT_SEC) / SWOOP_SEC);
  return {
    here: k < 1,
    along,
    x: OFF.x * k,
    y: OFF.y * k - 0.15 * Math.sin(Math.PI * k),
    z: OFF.z * k,
    yaw: Math.atan2(OFF.x, OFF.z),
    flap: Math.sin(t * 40),
    flying: true,
    bob: 0,
    look: 0,
  };
}
