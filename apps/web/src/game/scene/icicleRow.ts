import type { LakeSeason } from "@stillwater/shared";
import { BRIDGE_SCALE, BRIDGE_SPANS } from "./pierDeck";
import { DOCK_POST_CAPS } from "./snowyDock";

/** Icicles hang under the dock's edges all winter. */
export function iciclesOut(season: LakeSeason) {
  return season === "winter";
}

export type Icicle = { x: number; y: number; z: number; length: number; width: number };

/** bridge_wood.glb: the side walls' inner face stands this far out and their top this high, before scale (the node sits 0.05 down). Icicles hang off that inner top edge, where the dock camera sees them. */
const RAIL_X = 0.37;
const RAIL_TOP = 0.35;
export const RAIL_UNDERSIDE_Y = (RAIL_TOP - 0.05) * BRIDGE_SCALE;

/** Gap between icicles along an edge, metres, and how far each one strays from its even spacing. */
const SPACING = 0.14;
const JITTER = 0.04;
const MIN_LENGTH = 0.07;
const MAX_LENGTH = 0.22;

function hash(i: number, salt: number) {
  const s = Math.sin(i * 73.1 + salt * 19.7) * 43758.5453;
  return s - Math.floor(s);
}

function run(from: [number, number], to: [number, number], y: number, start: number): Icicle[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const count = Math.floor(length / SPACING);
  const out: Icicle[] = [];
  for (let n = 0; n < count; n += 1) {
    const i = start + n;
    // Some gaps are left bare, so it doesn't read as a fence.
    if (hash(i, 1) < 0.22) continue;
    const u = (n + 0.5 + (hash(i, 2) * 2 - 1) * (JITTER / SPACING)) / count;
    out.push({
      x: from[0] + (to[0] - from[0]) * u,
      y,
      z: from[1] + (to[1] - from[1]) * u,
      length: MIN_LENGTH + hash(i, 3) ** 1.5 * (MAX_LENGTH - MIN_LENGTH),
      width: 0.024 + hash(i, 4) * 0.016,
    });
  }
  return out;
}

/** Icicles along the inside of both side walls, between the posts. */
export const DOCK_ICICLES: readonly Icicle[] = (() => {
  const x = RAIL_X * BRIDGE_SCALE;
  const post = DOCK_POST_CAPS[0]!.size / 2 + 0.02;
  const reach = 0.45 * BRIDGE_SCALE;
  const out: Icicle[] = [];
  BRIDGE_SPANS.forEach((span, k) => {
    for (const side of [-1, 1]) {
      out.push(...run([side * x, span - reach + post], [side * x, span + reach - post], RAIL_UNDERSIDE_Y, k * 200 + (side + 1) * 50));
    }
  });
  return out;
})();
