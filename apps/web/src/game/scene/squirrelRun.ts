import { LAKE_CENTER_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Red squirrels on the far bank: one comes down a trunk, bounds across the grass to the next tree,
 * sits up to look about with a flick of its tail, and runs up out of sight; the next time round it
 * goes back the other way. Pure in time.
 */

export const SQUIRREL_CYCLE_SEC = 30;
const DOWN_SEC = 2.5;
const RUN_SEC = 5;
const SIT_SEC = 2.2;
const UP_SEC = 2.5;
/** How high up the trunk it shows before the crown hides it, in metres. */
const CLIMB = 2.4;
/** The trunk's half-width per unit of a tree's scale, so it clings to the bark rather than the air. */
const TRUNK_PER_SCALE = 0.045;
/** A bound's height and how many to the second. */
const HOP = 0.12;
const HOPS_PER_SEC = 3.2;

/** Out on dry days from spring to fall. */
export function squirrelsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season !== "winter" && (hour === "day" || hour === "dawn") && sky !== "rain";
}

export type Tree = { position: readonly [number, number, number]; scale: number };
export type SquirrelPose = { x: number; y: number; z: number; yaw: number; pitch: number; sit: number; tail: number };

/**
 * Pairs of neighbouring trees a squirrel runs between: up to `count`, each pair no further apart
 * than a dash across the grass, spread round the bank.
 */
export function squirrelRuns(trees: readonly Tree[], count: number): [Tree, Tree][] {
  const pairs: [Tree, Tree][] = [];
  for (let i = 0; i + 1 < trees.length; i += 1) {
    const a = trees[i]!;
    const b = trees[i + 1]!;
    const gap = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
    if (gap > 2.5 && gap < 9) pairs.push([a, b]);
  }
  if (pairs.length <= count) return pairs;
  return Array.from({ length: count }, (_, k) => pairs[Math.floor(((k + 0.5) * pairs.length) / count)]!);
}

/** The bark on the lake side of a tree, where the dock can see it. */
function trunkFace(tree: Tree) {
  const [x, , z] = tree.position;
  const dx = -x;
  const dz = LAKE_CENTER_Z - z;
  const d = Math.hypot(dx, dz) || 1;
  const r = TRUNK_PER_SCALE * tree.scale;
  return { x: x + (dx / d) * r, z: z + (dz / d) * r, out: Math.atan2(dx / d, dz / d) };
}

function smooth(x: number) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/**
 * Squirrel `k` of the run between `pair` at `time`, or null while it is up in the crown. `pitch` tips
 * its nose down (π/2 heading down a trunk, -π/2 climbing one), `sit` how far it is sat up, `tail` the
 * tail's flick.
 */
export function squirrelAt(k: number, pair: readonly [Tree, Tree], time: number): SquirrelPose | null {
  const shifted = time + k * 11.3;
  const round = Math.floor(shifted / SQUIRREL_CYCLE_SEC);
  const t = shifted - round * SQUIRREL_CYCLE_SEC;
  const [from, to] = round % 2 === 0 ? pair : [pair[1], pair[0]];
  const a = trunkFace(from);
  const b = trunkFace(to);
  const runYaw = Math.atan2(b.x - a.x, b.z - a.z);
  const flick = Math.sin(shifted * 7) * 0.3;
  if (t < DOWN_SEC) {
    // Head first down the bark, facing the ground.
    return { x: a.x, y: CLIMB * (1 - smooth(t / DOWN_SEC)) + 0.02, z: a.z, yaw: a.out, pitch: Math.PI / 2, sit: 0, tail: flick };
  }
  const run = t - DOWN_SEC;
  const total = RUN_SEC + SIT_SEC;
  if (run < total) {
    // Halfway over it stops and sits up to look about.
    const half = RUN_SEC / 2;
    const moving = run < half ? run : run < half + SIT_SEC ? half : run - SIT_SEC;
    const along = moving / RUN_SEC;
    const sitting = run >= half && run < half + SIT_SEC;
    const hop = sitting ? 0 : Math.abs(Math.sin(run * HOPS_PER_SEC * Math.PI)) * HOP;
    return {
      x: a.x + (b.x - a.x) * along,
      y: hop,
      z: a.z + (b.z - a.z) * along,
      yaw: runYaw,
      pitch: 0,
      sit: sitting ? smooth(Math.min(run - half, half + SIT_SEC - run) / 0.3) : 0,
      tail: sitting ? flick * 2 : flick,
    };
  }
  const up = run - total;
  if (up < UP_SEC) {
    return { x: b.x, y: CLIMB * smooth(up / UP_SEC) + 0.02, z: b.z, yaw: b.out + Math.PI, pitch: -Math.PI / 2, sit: 0, tail: flick };
  }
  return null;
}
