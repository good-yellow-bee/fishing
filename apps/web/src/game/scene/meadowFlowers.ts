import { SHOP_X, SHOP_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Patches of wildflowers on the grass round the shack, changing with the season, and the
 * bumblebees that work them on warm, dry days. Pure in time.
 */

type Patch = { x: number; z: number; r: number };

/** Where the patches grow: on the grass on the near side of the shack, either side of the path up from the campfire, where they show from the shack. */
export const PATCHES: readonly Patch[] = [
  { x: SHOP_X + 1.7, z: SHOP_Z + 1.5, r: 0.55 },
  { x: SHOP_X - 0.9, z: SHOP_Z + 1.4, r: 0.45 },
  { x: SHOP_X - 1.8, z: SHOP_Z + 2.9, r: 0.55 },
];
const PER_PATCH = 24;

/** The season's flowers: forget-me-nots, cuckooflower and buttercups in spring; daisies, clover and vetch in summer; asters and goldenrod in fall. */
const PALETTES: Record<LakeSeason, readonly string[]> = {
  spring: ["#7fa7e8", "#f2f0f7", "#e9d23c", "#d9b8e6"],
  summer: ["#f6f4ec", "#e47fae", "#8e62c4", "#ecc93a"],
  fall: ["#9a78c8", "#d9b23a", "#b58bd6"],
  winter: [],
};
/** In fall only some of the flowers are still out. */
const SHOWING: Record<LakeSeason, number> = { spring: 0.8, summer: 1, fall: 0.55, winter: 0 };

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export type Flower = { x: number; z: number; height: number; color: string; patch: number };

/** Every flower that is out this season, with its place, height and colour; none in winter. */
export function flowersIn(season: LakeSeason): Flower[] {
  const palette = PALETTES[season];
  const flowers: Flower[] = [];
  PATCHES.forEach((patch, p) => {
    for (let k = 0; k < PER_PATCH; k += 1) {
      const seed = p * 97 + k * 13;
      if (unit(seed + 5) >= SHOWING[season]) continue;
      // Spread over the patch, thicker toward its middle.
      const a = unit(seed + 1) * Math.PI * 2;
      const d = Math.sqrt(unit(seed + 2)) * patch.r;
      flowers.push({
        x: patch.x + Math.cos(a) * d,
        z: patch.z + Math.sin(a) * d * 0.8,
        height: 0.16 + unit(seed + 3) * 0.16,
        color: palette[Math.floor(unit(seed + 4) * palette.length)]!,
        patch: p,
      });
    }
  });
  return flowers;
}

/** Bumblebees come out by day in spring and summer, when it is neither raining nor foggy. */
export function beesOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && (season === "spring" || season === "summer") && sky !== "rain" && sky !== "fog";
}

export const BEE_COUNT = 4;
/** Seconds a bee spends on a flower, and flying to the next. */
const VISIT_SEC = 1.7;
const FLY_SEC = 0.6;
const STEP_SEC = VISIT_SEC + FLY_SEC;

/** Which flower bee `i` is on for its `n`th visit: always one in its own patch. */
function flowerFor(i: number, n: number, flowers: readonly Flower[]) {
  const own = flowers.filter((flower) => flower.patch === i % PATCHES.length);
  const pool = own.length > 0 ? own : flowers;
  return pool[Math.floor(unit(i * 31 + n * 7 + 3) * pool.length)]!;
}

export type BeePose = { x: number; y: number; z: number; yaw: number; flying: boolean };

/** Bee `i` `time` seconds in: settled on a flower, bobbing as it feeds, or buzzing on to the next. */
export function beeAt(i: number, time: number, flowers: readonly Flower[]): BeePose | null {
  if (flowers.length === 0) return null;
  const t = time + i * 0.83;
  const n = Math.floor(t / STEP_SEC);
  const into = t - n * STEP_SEC;
  const here = flowerFor(i, n, flowers);
  const next = flowerFor(i, n + 1, flowers);
  const yaw = Math.atan2(next.x - here.x, next.z - here.z);
  if (into < VISIT_SEC) {
    return { x: here.x, y: here.height + 0.03 + Math.abs(Math.sin(into * 9 + i)) * 0.012, z: here.z, yaw, flying: false };
  }
  const k = (into - VISIT_SEC) / FLY_SEC;
  const s = k * k * (3 - 2 * k);
  // A bumblebee's flight is a loose, wandering arc, lifting off and dropping onto the next flower.
  const lift = Math.sin(k * Math.PI) * 0.18;
  const wobble = Math.sin(k * Math.PI * 3 + i) * 0.04;
  return {
    x: here.x + (next.x - here.x) * s + Math.cos(yaw) * wobble,
    y: here.height + (next.height - here.height) * s + 0.03 + lift,
    z: here.z + (next.z - here.z) * s - Math.sin(yaw) * wobble,
    yaw,
    flying: true,
  };
}
