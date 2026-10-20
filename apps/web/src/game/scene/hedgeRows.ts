import * as THREE from "three";
import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { FAR_HILLS } from "./farHills";

/**
 * Hedgerows across the upper face of the hills behind the far bank, above the farm, the orchard and the hay
 * fields: rows of bushes running along the slope with gaps for gates, a few short hedges between the fields,
 * and here and there a hedgerow tree. An upright phone sees this part of the hills; a wide screen only its foot.
 * Still, so laid out once.
 */

/** The rows' heights on the hills' face, lowest first, and how far they run east and west. */
export const HEDGE_ROWS = [5.6, 7.0, 8.5, 10.0] as const;
export const HEDGE_WEST = -14;
export const HEDGE_EAST = 12;
/** Bush spacing along a row, and a bush's radius, drawn large enough to read at the hills' distance. */
const STEP = 0.26;
export const BUSH = 0.16;
/** How far a row rises and falls as it follows the slope. */
const WAVE = 0.25;
/** Gates to a row, each a gap this wide. */
const GATES = 2;
const GATE_WIDTH = 1.1;
/** Short hedges between neighbouring rows, splitting the band into fields. */
const DIVIDERS = 4;
/** One bush in this many along a row grows into a hedgerow tree. */
const TREE_EVERY = 29;

export type Bush = { x: number; y: number; z: number; size: number; shade: number };

function hash(i: number) {
  const s = Math.sin(i * 73.1 + 19.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Where row `row` runs at `x`, rising and falling a little along the slope. */
export function rowY(row: number, x: number) {
  return HEDGE_ROWS[row]! + WAVE * Math.sin(x * 0.35 + row * 1.7);
}

/** The drawn hills' lake-facing triangles in world space (each the same icosphere as the Hills mesh, moved and
 * stretched), nine coordinates apiece, with each one's x and y bounds for a quick miss. */
let facets: { t: Float64Array; box: Float64Array } | null = null;

function hillFacets() {
  if (facets) return facets;
  const unit = new THREE.IcosahedronGeometry(1, 2);
  const p = unit.getAttribute("position").array;
  const t: number[] = [];
  const box: number[] = [];
  for (const { position: [cx, cy, cz], scale: [rx, ry, rz] } of FAR_HILLS) {
    for (let i = 0; i < p.length; i += 9) {
      const tri = [0, 3, 6].flatMap((o) => [cx + p[i + o]! * rx, cy + p[i + o + 1]! * ry, cz + p[i + o + 2]! * rz]);
      const [ax, ay, , bx, by, , qx, qy] = tri as [number, number, number, number, number, number, number, number, number];
      // Only triangles facing the lake (+z) can be the front-most face.
      if ((bx - ax) * (qy - ay) - (by - ay) * (qx - ax) <= 0) continue;
      t.push(...tri);
      box.push(Math.min(ax, bx, qx), Math.max(ax, bx, qx), Math.min(ay, by, qy), Math.max(ay, by, qy));
    }
  }
  unit.dispose();
  facets = { t: Float64Array.from(t), box: Float64Array.from(box) };
  return facets;
}

/**
 * How far toward the lake the hills as drawn come at `x` and height `y`: their faceted faces, which sit a little
 * inside the smooth hillFront, so a small bush set on them touches the slope. Null off every hill.
 */
export function facetFront(x: number, y: number): number | null {
  const { t, box } = hillFacets();
  let front: number | null = null;
  for (let j = 0, i = 0; i < t.length; i += 9, j += 4) {
    if (x < box[j]! || x > box[j + 1]! || y < box[j + 2]! || y > box[j + 3]!) continue;
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = [t[i]!, t[i + 1]!, t[i + 2]!, t[i + 3]!, t[i + 4]!, t[i + 5]!, t[i + 6]!, t[i + 7]!, t[i + 8]!];
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-9) continue;
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
    if (u < 0 || v < 0 || u + v > 1) continue;
    const z = u * az + v * bz + (1 - u - v) * cz;
    if (front === null || z > front) front = z;
  }
  return front;
}

function bushAt(x: number, y: number, size: number, seed: number): Bush | null {
  const face = facetFront(x, y);
  if (face === null) return null;
  // Above the hills' middles the face leans back, so a bush half sunk into it sits on the slope.
  return { x, y, z: face + BUSH * size * 0.35, size, shade: hash(seed + 7) };
}

/** Every bush in the hedgerows: the rows with their gates and trees, then the field hedges between them. */
export function hedgeBushes(): Bush[] {
  const bushes: Bush[] = [];
  HEDGE_ROWS.forEach((_, row) => {
    const gates = Array.from({ length: GATES }, (_, g) => HEDGE_WEST + (HEDGE_EAST - HEDGE_WEST) * ((g + 0.3 + hash(row * 10 + g) * 0.4) / GATES));
    let n = 0;
    for (let x = HEDGE_WEST; x <= HEDGE_EAST; x += STEP, n += 1) {
      if (gates.some((gate) => Math.abs(x - gate) < GATE_WIDTH / 2)) continue;
      const seed = row * 1000 + n;
      const tree = (n + row * 5) % TREE_EVERY === 0;
      const bush = bushAt(x, rowY(row, x) + (tree ? BUSH : 0), tree ? 1.7 : 0.85 + hash(seed) * 0.35, seed);
      if (bush) bushes.push(bush);
    }
  });
  for (let row = 0; row < HEDGE_ROWS.length - 1; row += 1) {
    for (let d = 0; d < DIVIDERS; d += 1) {
      const x = HEDGE_WEST + (HEDGE_EAST - HEDGE_WEST) * ((d + 0.25 + hash(row * 50 + d) * 0.5) / DIVIDERS);
      const from = rowY(row, x);
      const to = rowY(row + 1, x);
      for (let y = from + STEP; y < to - STEP / 2; y += STEP) {
        const seed = 5000 + row * 100 + d * 10 + Math.round(y * 3);
        const bush = bushAt(x + (hash(seed) - 0.5) * 0.12, y, 0.8 + hash(seed + 1) * 0.3, seed);
        if (bush) bushes.push(bush);
      }
    }
  }
  return bushes;
}

/** The hedges' greens by season: fresh in spring, deep in summer, turning in the fall, bare twigs over the snow in winter. */
const HEDGE_LOOK: Record<LakeSeason, readonly [string, string]> = {
  spring: ["#5d8a4a", "#6f9a52"],
  summer: ["#3f623c", "#4a7044"],
  fall: ["#8a6234", "#9a4f2c"],
  winter: ["#857565", "#94846f"],
};
/** Under the night sky the hedges darken as the hills do. */
export const NIGHT_DIM = 0.55;

/** A bush's colour for the season, its own `shade` (0..1) picking between the season's two, dimmed at night. */
export function hedgeColor(season: LakeSeason, hour: LakeHour, shade: number): { hex: string; dim: number } {
  const [a, b] = HEDGE_LOOK[season];
  return { hex: shade < 0.6 ? a : b, dim: hour === "night" ? NIGHT_DIM : 1 };
}
