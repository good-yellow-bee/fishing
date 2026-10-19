import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Barn owl: at dusk from summer into the fall, a pale barn owl quarters low over the mown hay fields
 * on the hills behind the far bank. It beats slowly along the fields one way, stops to hover on
 * fluttering wings over something in the stubble, drops into it, rises again and beats on, then
 * turns and works the fields back the other way. Pure in time.
 */

/** Out at dusk while the hay fields lie mown, unless it is raining or foggy. */
export function barnOwlOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "dusk" && (season === "summer" || season === "fall") && sky !== "rain" && sky !== "fog";
}

/** The beat along the fields: its west and east ends, and how high above the stubble it flies. */
const WEST_X = -2.4;
const EAST_X = 8.6;
const FIELD_Y = 2.2;
const FLY_ABOVE = 0.8;
/** How far out from the hills' face it flies. */
const OUT = 0.7;
/** Seconds for a pass along the fields, the hover and the drop within it, and down in the stubble. */
const PASS_SEC = 22;
const HOVER_SEC = 2.6;
const DROP_SEC = 0.7;
const DOWN_SEC = 1.6;
const RISE_SEC = 1.4;
const STOP_SEC = HOVER_SEC + DROP_SEC + DOWN_SEC + RISE_SEC;
/** Where along a pass it stops to hunt, as a share of the pass. */
const HUNT_AT = 0.55;
export const LOOP_SEC = 2 * (PASS_SEC + STOP_SEC);
/** Seconds for one slow wingbeat while it flies, and one quick flutter while it hovers. */
const BEAT_SEC = 0.7;
const FLUTTER_SEC = 0.18;

export type OwlPose = {
  x: number;
  y: number;
  z: number;
  /** Which way along the fields it heads: 1 east, -1 west. */
  heading: 1 | -1;
  /** The wings' beat, -1 down to 1 up; folded 0 when it is down in the stubble. */
  wing: number;
  /** How far its wings are spread: 1 open, 0 folded. */
  spread: number;
};

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/** Out in front of the hills' face at `x`, `y`, as far up as it reaches. */
function inFront(x: number, y: number) {
  const face = Math.max(hillFront(x, y) ?? -30, hillFront(x, y + 0.6) ?? -30);
  return face + OUT;
}

/** The owl at `time`. `still` holds it hovering over the first field. */
export function barnOwlAt(time: number, still = false): OwlPose {
  const t = still ? HUNT_AT * PASS_SEC + 1 : ((time % LOOP_SEC) + LOOP_SEC) % LOOP_SEC;
  const leg = t < PASS_SEC + STOP_SEC ? 0 : 1;
  const heading: 1 | -1 = leg === 0 ? 1 : -1;
  const into = t - leg * (PASS_SEC + STOP_SEC);
  const huntFrom = HUNT_AT * PASS_SEC;
  // Time spent flying so far this pass: the stop holds it at the hunting spot.
  const flown = into < huntFrom ? into : into < huntFrom + STOP_SEC ? huntFrom : into - STOP_SEC;
  const share = flown / PASS_SEC;
  const x = heading > 0 ? WEST_X + (EAST_X - WEST_X) * share : EAST_X - (EAST_X - WEST_X) * share;
  const cruise = FIELD_Y + FLY_ABOVE + 0.15 * Math.sin(flown * 0.9);
  const stop = into - huntFrom;
  let y = cruise;
  let wing = Math.sin(((still ? 0 : time) / BEAT_SEC) * Math.PI * 2);
  let spread = 1;
  if (stop >= 0 && stop < STOP_SEC) {
    if (stop < HOVER_SEC) {
      wing = Math.sin(((still ? 0.3 : time) / FLUTTER_SEC) * Math.PI * 2);
    } else if (stop < HOVER_SEC + DROP_SEC) {
      // Wings up, dropping onto its prey.
      const k = (stop - HOVER_SEC) / DROP_SEC;
      y = cruise - (cruise - FIELD_Y) * k * k;
      wing = 1;
    } else if (stop < HOVER_SEC + DROP_SEC + DOWN_SEC) {
      y = FIELD_Y;
      wing = 0;
      spread = 0.2;
    } else {
      const k = smooth((stop - HOVER_SEC - DROP_SEC - DOWN_SEC) / RISE_SEC);
      y = FIELD_Y + (cruise - FIELD_Y) * k;
      wing = Math.sin(((still ? 0 : time) / (BEAT_SEC * 0.6)) * Math.PI * 2);
    }
  }
  return { x, y, z: inFront(x, y), heading, wing, spread };
}
