import type { LakeSeason } from "@stillwater/shared";
import { BARN_OFFSET, FARM_AT, FARM_SCALE, farmPoint } from "./farmstead";

/**
 * White storks on the barn: a nest of sticks sits on the west end of the barn's ridge on the far hills, and
 * from spring through summer a pair stands in it, one upright and one sitting. Now and then one throws its
 * head back and clatters its bill, and the standing one stretches its wings. The nest stays empty through
 * the fall and winter. Pure in time.
 */

/** The pair is home from spring to the end of summer. */
export function storksOut(season: LakeSeason) {
  return season === "spring" || season === "summer";
}

/** The barn's turn on the hillside, as the farmstead draws it, and where on its roof the nest sits: the ridge's west end, away from the grazing cows. */
const BARN_TURN = -0.15;
const RIDGE_END = { x: -0.4, y: 1.3 };

/** Where the nest's foot sits on the barn's ridge, in the world. */
export function nestAt() {
  // Farmstead.tsx stands the barn here, scaled and turned a little.
  const barn = farmPoint(FARM_AT.x + BARN_OFFSET.x, FARM_AT.y + BARN_OFFSET.y);
  const across = RIDGE_END.x * FARM_SCALE;
  return { x: barn.x + across * Math.cos(BARN_TURN), y: barn.y + RIDGE_END.y * FARM_SCALE, z: barn.z - across * Math.sin(BARN_TURN) };
}

/** The storks are drawn larger than life, as the farm is, so they read from across the lake. */
export const STORK_SCALE = 0.5;
/** The pair: where each stands in the nest, along the ridge, and how far down the sitter sinks into it. */
export const PAIR = [
  { along: -0.07, sink: 0 },
  { along: 0.1, sink: 0.26 },
] as const;

/** How often each bird clatters, and for how long; the second clatters halfway between the first's. */
const CLATTER_LOOP = 23;
const CLATTER_SEC = 3;
/** How often the standing bird stretches its wings, and for how long. */
const STRETCH_LOOP = 37;
const STRETCH_SEC = 2.5;

export type StorkPose = {
  /** How far the head is thrown back, 0 level to 1 bill to the sky. */
  headBack: number;
  /** The head's quick rattle while clattering, in radians. */
  rattle: number;
  /** How far the wings are spread, 0 folded to 1 wide. */
  spread: number;
  /** Turn about the vertical, in radians from facing the lake. */
  yaw: number;
};

function bell(u: number) {
  return u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI);
}

/** Stork `i` of the pair at `time`. `still` holds both standing quietly. */
export function storkAt(i: number, time: number, still = false): StorkPose {
  if (still) return { headBack: 0, rattle: 0, spread: 0, yaw: i === 0 ? 0.4 : -0.3 };
  const clatterT = (((time + i * (CLATTER_LOOP / 2)) % CLATTER_LOOP) + CLATTER_LOOP) % CLATTER_LOOP;
  const clatter = clatterT < CLATTER_SEC ? clatterT / CLATTER_SEC : -1;
  // Thrown back fast, held while rattling, brought down again.
  const headBack = clatter < 0 ? 0 : Math.min(1, Math.min(clatter, 1 - clatter) * 5);
  const rattle = clatter < 0 ? 0 : 0.12 * headBack * Math.sin(time * 38);
  const stretchT = ((time % STRETCH_LOOP) + STRETCH_LOOP) % STRETCH_LOOP;
  const spread = i === 0 && stretchT > 10 && stretchT < 10 + STRETCH_SEC ? bell((stretchT - 10) / STRETCH_SEC) : 0;
  // Looking slowly about.
  const yaw = (i === 0 ? 0.4 : -0.3) + 0.5 * Math.sin(time * 0.13 + i * 2.1);
  return { headBack, rattle, spread, yaw };
}
