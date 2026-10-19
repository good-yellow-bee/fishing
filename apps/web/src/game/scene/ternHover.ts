import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A few terns working the water over the day's fish patch: they circle a
 * couple of meters up, hover, and drop to the surface for small fry. From
 * the dock they show where the fish are before the bubbles do.
 */
export const TERN_COUNT = 3;
/** Meters up they circle, and how wide. */
export const TERN_HEIGHT = 2.6;
export const TERN_RADIUS = 1.7;
/** Each tern's round: circling, then one plunge and the climb back. */
export const TERN_CYCLE = 9;
export const PLUNGE_SEC = 0.45;
export const CLIMB_SEC = 0.9;
/** The moment terns hang at for reduced motion: all three circling, none in a plunge or over its splash. */
export const TERN_STILL_TIME = 1;
/** How low the plunge comes, just touching the water. */
const TOUCH_Y = 0.08;

export type TernPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Wingbeat, -1..1. */
  flap: number;
  /** Dropping to the water, bill first, wings folded. */
  diving: boolean;
  /** Seconds since it touched the water, while the little splash shows; -1 otherwise. */
  splash: number;
};

/** Out by day in the warm half of the year, not in rain. */
export function ternsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  return (hour === "day" || hour === "dawn") && (season === "spring" || season === "summer") && sky !== "rain";
}

function ease(u: number) {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

/** Tern `k` at `time`, working the patch centered on `center`. */
export function ternPose(k: number, time: number, center: { x: number; z: number }): TernPose {
  const rate = 0.55 + k * 0.08;
  const angle = time * rate + (k * Math.PI * 2) / TERN_COUNT;
  const radius = TERN_RADIUS * (0.8 + 0.25 * Math.sin(time * 0.4 + k));
  const x = center.x + Math.cos(angle) * radius;
  const z = center.z + Math.sin(angle) * radius;
  // Heading along the circle.
  const yaw = Math.atan2(-Math.sin(angle), Math.cos(angle));
  const into = (((time + k * (TERN_CYCLE / TERN_COUNT)) % TERN_CYCLE) + TERN_CYCLE) % TERN_CYCLE;
  const plungeAt = TERN_CYCLE - PLUNGE_SEC - CLIMB_SEC;
  const cruise = TERN_HEIGHT + Math.sin(time * 1.3 + k * 2) * 0.2;
  let y = cruise;
  let splash = -1;
  if (into >= plungeAt && into < plungeAt + PLUNGE_SEC) {
    y = cruise + (TOUCH_Y - cruise) * ease((into - plungeAt) / PLUNGE_SEC);
  } else if (into >= plungeAt + PLUNGE_SEC) {
    const since = into - plungeAt - PLUNGE_SEC;
    y = TOUCH_Y + (cruise - TOUCH_Y) * ease(since / CLIMB_SEC);
    splash = since;
  }
  // Quick, deep beats; a plunge folds the wings.
  const diving = into >= plungeAt && into < plungeAt + PLUNGE_SEC;
  const flap = diving ? -0.8 : Math.sin(time * 14 + k * 1.7);
  return { x, y, z, yaw, flap, diving, splash };
}
