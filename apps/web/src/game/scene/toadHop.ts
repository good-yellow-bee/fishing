import { DOCK_PLANKS, DOCK_STAND_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { visitAt } from "./visitClock";

/**
 * A toad on the dock on wet evenings: every so often one hauls itself up over the left edge of the
 * boards behind the angler, crosses them in short, unhurried hops with long sits between, its throat
 * pulsing as it sits and its eyes blinking, and drops off the far edge back into the wet. From spring
 * to fall, at dawn, dusk and night while it rains. Pure in time.
 */

type Spot = { x: number; z: number };

/** Out in the rain from spring to fall, except by day. */
export function toadOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season !== "winter" && sky === "rain" && hour !== "day";
}

/** Its way across the boards, behind the snail's loop and the mouse's run. */
export const TOAD_FROM: Spot = { x: DOCK_PLANKS.minX, z: DOCK_STAND_Z + 1.18 };
export const TOAD_TO: Spot = { x: DOCK_PLANKS.maxX, z: DOCK_STAND_Z + 1.1 };
export const TOAD_Y = DOCK_PLANKS.top;
/** How far below the boards' edge it is while climbing up or after dropping off. */
const UNDER = 0.14;

export const VISIT_EVERY_SEC = 70;
const FIRST_SEC = 6;
const CLIMB_SEC = 1.3;
const HOP_SEC = 0.42;
/** How long it sits after each hop; the long one is its rest in the middle. */
const SITS = [1.4, 2.2, 1.1, 6, 1.6, 2.4, 1.2];
const DROP_SEC = 0.7;
const HOPS = SITS.length + 1;
/** How high a hop lifts it. */
const HOP_UP = 0.06;
export const VISIT_SEC = CLIMB_SEC + HOPS * HOP_SEC + SITS.reduce((a, b) => a + b, 0) + DROP_SEC;

export type ToadPose = Spot & {
  here: boolean;
  y: number;
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** Its hind legs kicked out, 0 folded to 1 stretched, as it hops. */
  kick: number;
  /** Its throat swelling, 0 to 1, as it sits. */
  throat: number;
  /** Eyes shut, 0 or 1. */
  blink: number;
};

const YAW = Math.atan2(TOAD_TO.x - TOAD_FROM.x, TOAD_TO.z - TOAD_FROM.z);
const AWAY: ToadPose = { ...TOAD_FROM, here: false, y: TOAD_Y - UNDER, yaw: YAW, kick: 0, throat: 0, blink: 0 };

function along(k: number): Spot {
  return { x: TOAD_FROM.x + (TOAD_TO.x - TOAD_FROM.x) * k, z: TOAD_FROM.z + (TOAD_TO.z - TOAD_FROM.z) * k };
}

/** The toad `time` seconds in. `still` sits it in the middle of the boards. */
export function toadAt(time: number, still = false): ToadPose {
  if (still) return { ...along(0.5), here: true, y: TOAD_Y, yaw: YAW, kick: 0, throat: 0, blink: 0 };
  const { index, into } = visitAt(time, FIRST_SEC, VISIT_EVERY_SEC);
  if (index < 0 || into >= VISIT_SEC) return AWAY;
  if (into < CLIMB_SEC) {
    // Up over the edge, front feet first.
    const k = into / CLIMB_SEC;
    return { ...along(0), here: true, y: TOAD_Y - UNDER * (1 - k * k), yaw: YAW, kick: k < 0.8 ? 0.4 : 0, throat: 0, blink: 0 };
  }
  let t = into - CLIMB_SEC;
  for (let hop = 0; hop < HOPS; hop += 1) {
    const from = hop / HOPS;
    const to = (hop + 1) / HOPS;
    if (t < HOP_SEC) {
      const k = t / HOP_SEC;
      return { ...along(from + (to - from) * k), here: true, y: TOAD_Y + HOP_UP * Math.sin(Math.PI * k), yaw: YAW, kick: Math.sin(Math.PI * k), throat: 0, blink: 0 };
    }
    t -= HOP_SEC;
    const sit = SITS[hop];
    if (sit === undefined) break;
    if (t < sit) {
      // Sat, its throat pumping and now and then a slow blink.
      return { ...along(to), here: true, y: TOAD_Y, yaw: YAW, kick: 0, throat: 0.5 + 0.5 * Math.sin(t * 9), blink: t % 2.7 > 2.45 ? 1 : 0 };
    }
    t -= sit;
  }
  // Over the far edge and down.
  const k = Math.min(1, t / DROP_SEC);
  return { ...along(1), x: TOAD_TO.x + 0.12 * k, here: true, y: TOAD_Y + 0.03 * Math.sin(Math.PI * Math.min(1, k * 2)) - UNDER * k * k, yaw: YAW, kick: k < 0.5 ? 1 : 0, throat: 0, blink: 0 };
}
