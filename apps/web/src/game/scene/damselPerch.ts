import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { DOCK_POST_CAPS } from "./snowyDock";

/**
 * Damselflies: on calm summer days two bright blue damselflies keep to the dock, one each side. Each
 * settles on a post top beside the angler, wings folded along its back, then darts out low over the
 * water, hovers there a moment, and flits back to the other post on its side. Pure in time.
 */

type Point = { x: number; y: number; z: number };

/** A wind this strong keeps them down in the reeds: a breezy day's drift is about 0.08. */
const BLOWY = 0.07;

/** Out by day in summer, in fair weather with little wind. */
export function damselfliesOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season === "summer" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) < BLOWY;
}

/** The posts either side of where the angler stands (the front pair is the robin's). */
const standing = DOCK_POST_CAPS.filter((cap) => cap.z > 6 && cap.z < 7.5);
export const PERCHES: readonly Point[][] = [-1, 1].map((side) =>
  standing.filter((cap) => Math.sign(cap.x) === side).map((cap) => ({ x: cap.x, y: cap.y, z: cap.z })),
);
/** Where each hovers out over the water on its side of the dock, low over the surface. */
export const HOVERS: readonly Point[][] = [-1, 1].map((side) => [
  { x: side * 1.7, y: 0.42, z: 6.1 },
  { x: side * 1.45, y: 0.36, z: 7.6 },
]);
export const DAMSELS = 2;

/** Seconds settled on a post, darting between spots, and hovering out over the water. */
const PERCH_SEC = 7;
const FLIT_SEC = 1.1;
const HOVER_SEC = 2.2;
const HALF_SEC = PERCH_SEC + 2 * FLIT_SEC + HOVER_SEC;
export const LOOP_SEC = 2 * HALF_SEC;

export type DamselPose = Point & { /** Facing, as a yaw for a model facing +z. */ yaw: number; /** Wings beating, 0 or 1. */ flying: number };

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function heading(from: Point, to: Point) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** A dart from one spot to the next: quick, a little up and over, with a jink sideways halfway. */
function dart(from: Point, to: Point, t: number): DamselPose {
  const k = smooth(t);
  const jink = 0.12 * Math.sin(Math.PI * 2 * k);
  const yaw = heading(from, to);
  return {
    x: from.x + (to.x - from.x) * k + Math.cos(yaw) * jink,
    y: from.y + (to.y - from.y) * k + 0.15 * Math.sin(Math.PI * k),
    z: from.z + (to.z - from.z) * k - Math.sin(yaw) * jink,
    yaw,
    flying: 1,
  };
}

/** Damselfly `i` at `time`. `still` keeps it settled on its first post. */
export function damselAt(i: number, time: number, still = false): DamselPose {
  const posts = PERCHES[i]!;
  const hovers = HOVERS[i]!;
  // Settled, it faces out over the water on its side.
  const settledYaw = i === 0 ? -Math.PI / 2 : Math.PI / 2;
  if (still) return { ...posts[0]!, yaw: settledYaw, flying: 0 };
  const t = (((time + i * 5.3) % LOOP_SEC) + LOOP_SEC) % LOOP_SEC;
  const half = t < HALF_SEC ? 0 : 1;
  const from = posts[half]!;
  const hover = hovers[half]!;
  const to = posts[1 - half]!;
  let into = t - half * HALF_SEC;
  if (into < PERCH_SEC) return { ...from, yaw: settledYaw, flying: 0 };
  into -= PERCH_SEC;
  if (into < FLIT_SEC) return dart(from, hover, into / FLIT_SEC);
  into -= FLIT_SEC;
  if (into < HOVER_SEC) {
    // Hanging in the air, drifting a hand's breadth and turning to look about.
    return { x: hover.x + 0.04 * Math.sin(into * 5), y: hover.y + 0.03 * Math.sin(into * 7), z: hover.z, yaw: heading(from, hover) + 0.6 * Math.sin(into * 1.4), flying: 1 };
  }
  return dart(hover, to, (into - HOVER_SEC) / FLIT_SEC);
}
