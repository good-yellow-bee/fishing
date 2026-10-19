import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A hot-air balloon drifting over the lake on still summer dawns, the hour balloonists fly. It
 * comes in high over the trees on one side, sinks to skim the far water, dips its basket to touch
 * the surface mid-lake, and climbs away over the other bank with the breeze. Every so often the
 * burner roars: a flare of flame under the envelope and a gentle lift. Then the sky stays empty a
 * while before the next one comes over. Pure in time.
 */

/** Out at dawn in late spring and summer, under a clear or broken sky, when the air is near still. */
export function balloonOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "dawn" && (season === "summer" || season === "spring") && (sky === "clear" || sky === "partly-cloudy") && Math.hypot(wind.x, wind.z) < CALMEST;
}

/** Balloonists stay down once the breeze is stronger than this. */
export const CALMEST = 0.05;
/** Seconds to cross from one side of the far shore to the other, and between one crossing's start and the next. */
export const CROSS_SEC = 210;
export const BALLOON_EVERY_SEC = 270;
/** Its line across: from x -SPAN to SPAN over the far half of the lake, well clear of the dock. */
const SPAN = 34;
export const ACROSS_Z = -10;
/** The basket's height as it skims the water, how much higher it climbs to clear the trees at each end, and its slow bob. */
const SKIM = 1.5;
const OVER_BANKS = 6;
/** It climbs from this far out along its line (0 mid-lake, 1 at either end) to this far, before the bank's trees. */
const CLIMB_FROM = 0.3;
const CLIMB_TO = 0.55;
const BOB = 0.2;
/** Mid-lake it sinks until the basket's bottom just kisses the water, for this share of the crossing. */
const DIP_SHARE = 0.12;
/** The burner fires for this long every so often, lifting the balloon a little each time. */
export const BURN_SEC = 1.8;
export const BURN_EVERY_SEC = 11;
const BURN_LIFT = 0.18;

/** Where the basket's origin sits when its bottom just touches the water. */
export const BASKET_KISS = 0.04;

export type BalloonPose = {
  x: number;
  y: number;
  z: number;
  /** A slow turn about its rope, in radians. */
  yaw: number;
  /** 0 burner off to 1 full flame. */
  flame: number;
};

/** The balloon `time` seconds in, or null while the sky is empty between crossings. `still` holds it mid-crossing with the burner off. */
export function balloonAt(time: number, wind: { x: number; z: number }, still = false): BalloonPose | null {
  const into = still ? CROSS_SEC * 0.42 : ((time % BALLOON_EVERY_SEC) + BALLOON_EVERY_SEC) % BALLOON_EVERY_SEC;
  if (into >= CROSS_SEC) return null;
  const p = into / CROSS_SEC;
  // It goes the way the air drifts; with no drift at all, west to east.
  const way = wind.x < 0 ? -1 : 1;
  const burnInto = into % BURN_EVERY_SEC;
  const flame = still ? 0 : burnInto < BURN_SEC ? Math.sin((burnInto / BURN_SEC) * Math.PI) : 0;
  // Each burn gives a little lift that settles away before the next.
  const lift = still ? 0 : BURN_LIFT * Math.min(1, burnInto / BURN_SEC) * (1 - burnInto / BURN_EVERY_SEC);
  const out = Math.abs(p * 2 - 1);
  const dip = Math.max(0, 1 - Math.abs(p - 0.5) / (DIP_SHARE / 2));
  const dipEase = dip * dip * (3 - 2 * dip);
  const climb = Math.min(1, Math.max(0, (out - CLIMB_FROM) / (CLIMB_TO - CLIMB_FROM)));
  const cruise = SKIM + OVER_BANKS * climb * climb * (3 - 2 * climb) + BOB * Math.sin(into * 0.4) + lift;
  return {
    x: way * (p * 2 - 1) * SPAN,
    y: cruise + (BASKET_KISS - cruise) * dipEase,
    z: ACROSS_Z + 1.5 * Math.sin(p * Math.PI * 2),
    yaw: into * 0.05,
    flame,
  };
}
