import { LAKE_CENTER_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A hammock slung between two trees across the lake on warm days, someone stretched out in it
 * with a book. It sways slowly, now and then they push off the trunk with a foot to set it going
 * again, and every so often they turn a page. Pure in time.
 */

type Tree = { position: readonly [number, number, number]; scale: number };
type Spot = { x: number; y: number; z: number };

/** By day in late spring and summer, unless it is raining or foggy. */
export function hammockOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && (season === "summer" || season === "spring") && sky !== "rain" && sky !== "fog";
}

/** How far apart the two trees may stand, trunk to trunk, and how far back across the lake they must be. */
const GAP_MIN = 2.6;
const GAP_MAX = 5;
const FAR_Z = LAKE_CENTER_Z - 10;
/** The ropes are tied this high up each trunk. */
export const TIE_HEIGHT = 1.25;
const TRUNK_PER_SCALE = 0.045;

/** The two neighbouring trees across the lake it hangs between: the first such pair west of the middle, by the campers' tent and clear of the disc players on the east bank; null if none fits. */
export function hammockTrees<T extends Tree>(trees: readonly T[]): [T, T] | null {
  for (let i = 0; i + 1 < trees.length; i++) {
    const a = trees[i]!;
    const b = trees[i + 1]!;
    if (a.position[2] > FAR_Z || b.position[2] > FAR_Z || a.position[0] > 0) continue;
    const gap = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
    if (gap >= GAP_MIN && gap <= GAP_MAX) return [a, b];
  }
  return null;
}

/** Where the ropes are tied: on each trunk's side facing the other, at TIE_HEIGHT. */
export function hammockTies(a: Tree, b: Tree): [Spot, Spot] {
  const dx = b.position[0] - a.position[0];
  const dz = b.position[2] - a.position[2];
  const d = Math.hypot(dx, dz) || 1;
  const ra = TRUNK_PER_SCALE * a.scale;
  const rb = TRUNK_PER_SCALE * b.scale;
  return [
    { x: a.position[0] + (dx / d) * ra, y: TIE_HEIGHT, z: a.position[2] + (dz / d) * ra },
    { x: b.position[0] - (dx / d) * rb, y: TIE_HEIGHT, z: b.position[2] - (dz / d) * rb },
  ];
}

/** A push off the trunk this often sets it swinging again; the swing then dies away. */
export const PUSH_EVERY_SEC = 14;
/** Four whole swings to each push, so the next push picks the swing up where it left off. */
const SWING_SEC = PUSH_EVERY_SEC / 4;
const PUSH_SWING = 0.2;
const SETTLE_SEC = 9;
/** A page is turned this often, the turn taking this long. */
export const PAGE_EVERY_SEC = 23;
export const PAGE_TURN_SEC = 0.9;

/** How far the hammock has swung about its ropes' line at `time`, in radians. `still` hangs it at rest. */
export function hammockSwing(time: number, still = false) {
  if (still) return 0;
  const since = ((time % PUSH_EVERY_SEC) + PUSH_EVERY_SEC) % PUSH_EVERY_SEC;
  // A gentle sway remains even as the push dies away.
  return PUSH_SWING * Math.exp(-since / SETTLE_SEC) * Math.sin((since / SWING_SEC) * Math.PI * 2) + 0.03 * Math.sin(time * 0.7);
}

/** How far the page being turned has gone over, 0 lying flat on the right to 1 over on the left; 0 when none is turning. */
export function pageTurn(time: number, still = false) {
  if (still) return 0;
  const since = ((time % PAGE_EVERY_SEC) + PAGE_EVERY_SEC) % PAGE_EVERY_SEC;
  return since < PAGE_TURN_SEC ? since / PAGE_TURN_SEC : 0;
}

/** The pushing foot reaches out to the trunk just before each push, and back. 0 tucked in, 1 against the trunk. */
export function footPush(time: number, still = false) {
  if (still) return 0;
  const since = ((time % PUSH_EVERY_SEC) + PUSH_EVERY_SEC) % PUSH_EVERY_SEC;
  const to = PUSH_EVERY_SEC - since;
  if (to < 0.8) return 1 - to / 0.8;
  if (since < 0.6) return 1 - since / 0.6;
  return 0;
}
