import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A field mouse on the dock: on evenings and nights from spring to fall, every so often a mouse
 * climbs up over the left edge of the boards behind the angler, scurries across in quick dashes
 * with stops between, sits up to nibble a crumb for a moment, then darts on over the right edge
 * and drops out of sight. Pure in time.
 */

type Spot = { x: number; z: number };

/** Out at dusk and through the night from spring to fall, but not in the rain. */
export function mouseOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return (hour === "dusk" || hour === "night") && season !== "winter" && sky !== "rain";
}

/** Where it comes up over the edge, the crumb it stops at, and where it goes over the far edge: behind where the angler stands. */
export const MOUSE_FROM: Spot = { x: DOCK_PLANKS.minX, z: DOCK_STAND_Z + 1.05 };
export const CRUMB: Spot = { x: DOCK_STAND_X + 0.12, z: DOCK_STAND_Z + 0.9 };
export const MOUSE_TO: Spot = { x: DOCK_PLANKS.maxX, z: DOCK_STAND_Z + 0.75 };
export const MOUSE_Y = DOCK_PLANKS.top;
/** One visit, every so often, and when the first comes after you arrive. */
export const VISIT_EVERY_SEC = 55;
const FIRST_SEC = 12;
/** Climbing up over the edge, and dropping back down it. */
const CLIMB_SEC = 0.5;
/** The way to the crumb, in this many dashes, each this long with a stop after it. */
const DASHES_IN = 3;
const DASH_SEC = 0.45;
const STOP_SEC = 0.9;
/** Sitting up nibbling at the crumb. */
const NIBBLE_SEC = 4;
/** One long dart from the crumb to the far edge. */
const DART_SEC = 0.7;
export const VISIT_SEC = CLIMB_SEC + DASHES_IN * (DASH_SEC + STOP_SEC) + NIBBLE_SEC + DART_SEC + CLIMB_SEC;
/** How far below the boards' top it is while out of sight under the edge. */
const UNDER = 0.12;

export type MousePose = Spot & {
  /** Whether it is about at all. */
  here: boolean;
  y: number;
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** Running, 0 or 1: the quick patter of its feet and its swinging tail. */
  running: number;
  /** Sat up on its haunches, 0 to 1. */
  sitting: number;
  /** Its head bobbing as it nibbles or sniffs, -1 to 1. */
  nibble: number;
  /** How much of it shows, 0 to 1: out of the snow on a winter bank, always all of it on the dock. */
  show: number;
};

/** Its way: where it comes up, the crumb it stops at, where it goes, its ground's height, and whether it climbs over the dock's edges or pops out of the snow and dives back in. */
export type MouseWay = { from: Spot; crumb: Spot; to: Spot; y: (x: number, z: number) => number; edges: boolean };

export const DOCK_MOUSE_WAY: MouseWay = { from: MOUSE_FROM, crumb: CRUMB, to: MOUSE_TO, y: () => MOUSE_Y, edges: true };

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function between(a: Spot, b: Spot, t: number): Spot {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

function facing(a: Spot, b: Spot) {
  return Math.atan2(b.x - a.x, b.z - a.z);
}

/** The mouse `t` seconds into its run along `way` (0 to VISIT_SEC). `still` keeps it sat up at the crumb. */
export function mouseCrossingAt(t: number, way: MouseWay, still = false): MousePose {
  const yawIn = facing(way.from, way.crumb);
  const yawOut = facing(way.crumb, way.to);
  const at = (spot: Spot, rest: Omit<MousePose, "x" | "z" | "y" | "here" | "show"> & { sink?: number; show?: number }): MousePose => {
    const { sink = 0, show = 1, ...pose } = rest;
    return { here: show > 0, ...spot, y: way.y(spot.x, spot.z) - sink, show, ...pose };
  };
  if (still) return at(way.crumb, { yaw: yawIn, running: 0, sitting: 1, nibble: 0 });
  // Up over the edge, nose first; or up out of the snow.
  if (t < CLIMB_SEC) {
    const k = smooth(t / CLIMB_SEC);
    return at(way.from, { yaw: yawIn, running: 1, sitting: 0, nibble: 0, ...(way.edges ? { sink: UNDER * (1 - k) } : { show: Math.max(0.01, k) }) });
  }
  t -= CLIMB_SEC;
  // Dash, stop and sniff, dash again, toward the crumb.
  const leg = DASH_SEC + STOP_SEC;
  if (t < DASHES_IN * leg) {
    const dash = Math.floor(t / leg);
    const into = t - dash * leg;
    const moving = into < DASH_SEC;
    const done = (dash + (moving ? smooth(into / DASH_SEC) : 1)) / DASHES_IN;
    return at(between(way.from, way.crumb, done), { yaw: yawIn, running: moving ? 1 : 0, sitting: 0, nibble: moving ? 0 : Math.sin(into * 22) });
  }
  t -= DASHES_IN * leg;
  // Up on its haunches, turning the crumb in its paws.
  if (t < NIBBLE_SEC) {
    const sitting = smooth(t / 0.3) * smooth((NIBBLE_SEC - t) / 0.3);
    // Partway through it turns toward the far edge, ready to go.
    const turn = smooth((t - (NIBBLE_SEC - 0.8)) / 0.5);
    return at(way.crumb, { yaw: yawIn + (yawOut - yawIn) * turn, running: 0, sitting, nibble: Math.sin(t * 16) });
  }
  t -= NIBBLE_SEC;
  if (t < DART_SEC) return at(between(way.crumb, way.to, smooth(t / DART_SEC)), { yaw: yawOut, running: 1, sitting: 0, nibble: 0 });
  t -= DART_SEC;
  // Over the edge and down out of sight; or back under the snow.
  const k = smooth(t / CLIMB_SEC);
  return at(way.to, { yaw: yawOut, running: 1, sitting: 0, nibble: 0, ...(way.edges ? { sink: UNDER * k, show: k < 1 ? 1 : 0 } : { show: 1 - k }) });
}

/** How far along its way (metres, from where it came up) the mouse has run `t` seconds in: its tracks reach this far. */
export function mouseTrailAt(t: number, way: MouseWay) {
  const pose = mouseCrossingAt(Math.min(t, VISIT_SEC - 1e-6), way);
  const first = Math.hypot(way.crumb.x - way.from.x, way.crumb.z - way.from.z);
  const k = t - CLIMB_SEC - DASHES_IN * (DASH_SEC + STOP_SEC) - NIBBLE_SEC;
  return k <= 0 ? Math.hypot(pose.x - way.from.x, pose.z - way.from.z) : first + Math.hypot(pose.x - way.crumb.x, pose.z - way.crumb.z);
}

const AWAY: MousePose = { here: false, x: MOUSE_FROM.x, y: MOUSE_Y - UNDER, z: MOUSE_FROM.z, yaw: 0, running: 0, sitting: 0, nibble: 0, show: 0 };

/** The dock mouse `time` seconds in. `still` keeps it sat up at the crumb. */
export function mouseAt(time: number, still = false): MousePose {
  if (still) return mouseCrossingAt(0, DOCK_MOUSE_WAY, true);
  const since = time - FIRST_SEC;
  if (since < 0) return AWAY;
  const t = since % VISIT_EVERY_SEC;
  return t >= VISIT_SEC ? AWAY : mouseCrossingAt(t, DOCK_MOUSE_WAY);
}

/** Out on a winter bank instead, at dusk and through the night, over the snow (bankMouse.ts). */
export function snowMouseOut(hour: LakeHour, season: LakeSeason) {
  return (hour === "dusk" || hour === "night") && season === "winter";
}
