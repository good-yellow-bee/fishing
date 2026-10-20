import { DOCK_PLANKS, DOCK_STAND_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { visitAt } from "./visitClock";

/**
 * A toad on the dock on wet evenings: every so often one hauls itself up over the left edge of the
 * boards behind the angler, crosses them in short, unhurried hops with long sits between, its throat
 * pulsing as it sits and its eyes blinking, and drops off the far edge back into the wet. From spring
 * to fall, at dawn, dusk and night while it rains. Pure in time since it came out.
 */

type Spot = { x: number; z: number };

/** Out in the rain from spring to fall, except by day. */
export function toadOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season !== "winter" && sky === "rain" && hour !== "day";
}

/** Its way across the boards, between the angler's heels and the snail's loop. */
export const TOAD_FROM: Spot = { x: DOCK_PLANKS.minX, z: DOCK_STAND_Z + 0.45 };
export const TOAD_TO: Spot = { x: DOCK_PLANKS.maxX, z: DOCK_STAND_Z + 0.4 };
export const TOAD_Y = DOCK_PLANKS.top;
/** How far below the boards' edge it is while climbing up or after dropping off, and out beside them. */
const UNDER = 0.14;
const BESIDE = 0.12;

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
  /** How much of it shows, 0 to 1: out of the wet grass on a bank, always all of it on the dock. */
  show: number;
};

/** Its way across: from and to, its ground's height, and whether it climbs over an edge at each end (the dock) or creeps out of the wet grass and back in (a bank). */
export type ToadWay = { from: Spot; to: Spot; y: (x: number, z: number) => number; edges: boolean };

export const DOCK_WAY: ToadWay = { from: TOAD_FROM, to: TOAD_TO, y: () => TOAD_Y, edges: true };

/** The toad `into` seconds into its crossing of `way` (0 to VISIT_SEC), or `still` sat in the middle of it. */
export function crossingAt(into: number, way: ToadWay, still = false): ToadPose {
  const yaw = Math.atan2(way.to.x - way.from.x, way.to.z - way.from.z);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const along = (k: number): Spot => ({ x: way.from.x + (way.to.x - way.from.x) * k, z: way.from.z + (way.to.z - way.from.z) * k });
  const at = (spot: Spot, lift: number, rest: Partial<ToadPose>): ToadPose => ({ ...spot, here: true, y: way.y(spot.x, spot.z) + lift, yaw, kick: 0, throat: 0, blink: 0, show: 1, ...rest });
  if (still) return at(along(0.5), 0, {});
  if (into < CLIMB_SEC) {
    const k = into / CLIMB_SEC;
    // Up over the edge, front feet first; or out of the grass.
    if (!way.edges) return at(along(0), 0, { show: k * k * (3 - 2 * k), kick: 0.3 * Math.sin(Math.PI * k) });
    const start = along(0);
    return at({ x: start.x - fx * BESIDE * (1 - k), z: start.z - fz * BESIDE * (1 - k) }, -UNDER * (1 - k * k), { kick: 0.4 * Math.sin(Math.PI * k) });
  }
  let t = into - CLIMB_SEC;
  for (let hop = 0; hop < HOPS; hop += 1) {
    const from = hop / HOPS;
    const to = (hop + 1) / HOPS;
    if (t < HOP_SEC) {
      const k = t / HOP_SEC;
      return at(along(from + (to - from) * k), HOP_UP * Math.sin(Math.PI * k), { kick: Math.sin(Math.PI * k) });
    }
    t -= HOP_SEC;
    const sit = SITS[hop];
    if (sit === undefined) break;
    if (t < sit) {
      // Sat, its throat pumping, settling in and out of it, and now and then a slow blink.
      const settle = Math.min(1, t / 0.3, (sit - t) / 0.3);
      return at(along(to), 0, { throat: settle * (0.5 - 0.5 * Math.cos(t * 9)), blink: t % 2.2 > 0.85 && t % 2.2 < 1.05 ? 1 : 0 });
    }
    t -= sit;
  }
  // Over the far edge and down; or back into the grass.
  const k = Math.min(1, t / DROP_SEC);
  if (!way.edges) return at(along(1), 0, { show: 1 - k * k * (3 - 2 * k) });
  const end = along(1);
  return at({ x: end.x + fx * BESIDE * k, z: end.z + fz * BESIDE * k }, 0.03 * Math.sin(Math.PI * Math.min(1, k * 2)) - UNDER * k * k, { kick: Math.sin(Math.PI * Math.min(1, k * 2)) });
}

const AWAY: ToadPose = { ...TOAD_FROM, here: false, y: TOAD_Y - UNDER, yaw: 0, kick: 0, throat: 0, blink: 0, show: 0 };

/** The dock toad `time` seconds after it came out (so it never appears mid-crossing). `still` sits it in the middle of the boards. */
export function toadAt(time: number, still = false): ToadPose {
  if (still) return crossingAt(0, DOCK_WAY, true);
  const { index, into } = visitAt(time, FIRST_SEC, VISIT_EVERY_SEC);
  if (index < 0 || into >= VISIT_SEC) return AWAY;
  return crossingAt(into, DOCK_WAY);
}
