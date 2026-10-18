import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { CABIN_AT, CABIN_SCALE, CABIN_WALLS, CABIN_YAW } from "./cabinLook";

/**
 * Someone out in a rocking chair in front of the far cabin of an evening, from spring to fall,
 * a lantern on the boards beside them. They rock gently, now and then lift a mug to sip, and sit
 * on into the night. Pure in time.
 */

/** Where the chair stands, in the cabin's own frame before scaling: in front of one window, out from the front wall. */
const CHAIR_ACROSS = 0.8;
const CHAIR_OUT = 0.5;
/** The lantern, on the ground beside the chair. */
const LANTERN_ACROSS = 1.35;
/** One rock forward and back, and how far it tips each way, in radians. */
export const ROCK_SEC = 2.6;
const ROCK_TIP = 0.11;
/** How often they lift the mug, and for how long. */
const SIP_EVERY = 14;
const SIP_SEC = 2.6;

/** Out at dusk and at night from spring to fall, unless it is raining. */
export function porchOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dusk" || hour === "night") && season !== "winter" && sky !== "rain";
}

/** A point in front of the cabin, in its frame before scaling (x along the front, z out from its middle). */
function inFront(across: number, out: number) {
  const x = across * CABIN_SCALE;
  const z = (CABIN_WALLS.depth / 2 + out) * CABIN_SCALE;
  const cos = Math.cos(CABIN_YAW);
  const sin = Math.sin(CABIN_YAW);
  return { x: CABIN_AT.x + x * cos + z * sin, z: CABIN_AT.z - x * sin + z * cos };
}

export const CHAIR_AT = inFront(CHAIR_ACROSS, CHAIR_OUT);
export const LANTERN_AT = inFront(LANTERN_ACROSS, CHAIR_OUT + 0.15);
/** The chair faces the lake, as the cabin does. */
export const CHAIR_YAW = CABIN_YAW;

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export type RockerPose = {
  /** How far the chair tips back on its rockers, in radians (forward is negative). */
  tip: number;
  /** The mug at the lips, 0 in the lap to 1 raised. */
  sip: number;
};

/** The rocker `time` seconds in. `still` sits them level, mug in lap. */
export function rockerAt(time: number, still = false): RockerPose {
  if (still) return { tip: 0, sip: 0 };
  const s = ((time % SIP_EVERY) + SIP_EVERY) % SIP_EVERY;
  const sip = s > SIP_SEC ? 0 : smooth(s / 0.7) * (1 - smooth((s - (SIP_SEC - 0.7)) / 0.7));
  // They rock a little less while sipping.
  return { tip: Math.sin((time / ROCK_SEC) * Math.PI * 2) * ROCK_TIP * (1 - sip * 0.6), sip };
}

/** The lantern's flicker, around full. */
export function lanternFlicker(time: number, still = false) {
  return still ? 1 : 0.9 + 0.06 * Math.sin(time * 7.3) + 0.04 * Math.sin(time * 13.1 + 1);
}
