import type { LakeSeason } from "@stillwater/shared";
import { hillFront } from "./farHills";

/**
 * Hay fields: once the hay is cut in summer, two fields on the hills behind the far bank lie mown
 * in pale stripes along the slope, with round bales dotted across them, and stay so into the fall.
 * Still, so laid out once.
 */

/** From the summer's hay cut until the snow. */
export function balesOut(season: LakeSeason) {
  return season === "summer" || season === "fall";
}

/** A bale's radius and length, drawn a little larger than life so they read at the hills' distance. */
export const BALE_RADIUS = 0.3;
export const BALE_LENGTH = 0.48;
/** How far a bale sits into the hill's face, of its radius, so it rests on the slope rather than floating on it. */
const SINK = 0.4;
/** How far the mown field stands off the hill's face, so the face never shows through it. */
export const FIELD_LIFT = 0.04;

/** The fields on the open face between the far trees: their middles and half sizes by x and height, and their bales' rows. */
export const FIELDS = [
  { x: 0.5, y: 2.5, halfX: 3.2, halfY: 1.1, rows: [{ y: 1.9, count: 3 }, { y: 2.9, count: 2 }] },
  { x: 6.8, y: 2.6, halfX: 2, halfY: 0.9, rows: [{ y: 2.4, count: 2 }] },
] as const;

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * A point on field `f`'s face for `u`, `v` from -1 to 1 across and up it: the square is pulled in to a
 * rounded field's outline, and set out on the hill's face. Null off the hills.
 */
export function fieldPoint(f: number, u: number, v: number) {
  const field = FIELDS[f]!;
  // Halfway between the square and a disc: a field with rounded corners.
  const roundU = u * (0.5 + 0.5 * Math.sqrt(1 - (v * v) / 2));
  const roundV = v * (0.5 + 0.5 * Math.sqrt(1 - (u * u) / 2));
  const x = field.x + field.halfX * roundU;
  const y = field.y + field.halfY * roundV;
  const face = hillFront(x, y);
  return face === null ? null : { x, y, z: face + FIELD_LIFT };
}

export type Bale = { x: number; y: number; z: number; yaw: number };

/** Every bale on the fields, a few to a row, each a little off its row and turned its own way. */
export function hayBales(): Bale[] {
  const bales: Bale[] = [];
  let seed = 0;
  FIELDS.forEach((field) => {
    field.rows.forEach((row) => {
      for (let i = 0; i < row.count; i += 1) {
        seed += 1;
        const share = (i + 0.5 + (hash(seed) - 0.5) * 0.5) / row.count;
        const x = field.x - field.halfX * 0.75 + field.halfX * 1.5 * share;
        const y = row.y + (hash(seed + 40) - 0.5) * 0.2;
        const face = hillFront(x, y);
        if (face === null) continue;
        bales.push({ x, y, z: face + BALE_RADIUS * (1 - SINK), yaw: (hash(seed + 80) - 0.5) * 1.2 });
      }
    });
  });
  return bales;
}
