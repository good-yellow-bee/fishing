import { inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Lake smoke: on cold clear dawns in fall and winter the water is warmer than the air, and wisps
 * of steam rise off it all over the lake, curling up, leaning with the breeze and thinning away,
 * each soon followed by another somewhere else. Pure in time.
 */

type Point = { x: number; y: number; z: number };

export const WISPS = 34;
/** Soft puffs stacked in each wisp. */
export const PUFFS = 3;
/** How long one wisp lives, how high it rises, and how thick it gets at most. */
export const WISP_LIFE_SEC = 7.5;
const RISE = 1.5;
const THICKEST = 0.4;
/** Wisps keep to the far side of the dock, so none billows up in the angler's face. */
const NEAREST_Z = 1.5;
/** The furthest a wisp leans downwind for each metre it rises, however hard it blows. */
const MOST_LEAN = 0.7;
/** Room round a wisp's home for its lean and curl, so it never drifts over the bank. */
const REACH = 2.4;

/** At dawn in fall and winter, under a clear or overcast sky; fog brings its own mist and rain stirs the air. */
export function lakeSmokeOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "dawn" && (season === "fall" || season === "winter") && (sky === "clear" || sky === "overcast");
}

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Where wisp `index` rises in its `round`-th life: somewhere out on the water, well in from the bank. */
export function wispHome(index: number, round: number): { x: number; z: number } {
  for (let k = 0; k < 24; k++) {
    const seed = index * 131 + round * 17 + k * 7;
    const x = (hash(seed) * 2 - 1) * LAKE_RX * 0.85;
    const z = LAKE_CENTER_Z + (hash(seed + 0.5) * 2 - 1) * LAKE_RZ * 0.85;
    if (z < NEAREST_Z && [0, 1, 2, 3, 4, 5, 6, 7].every((a) => inLake(x + Math.cos(a * 0.785) * REACH, z + Math.sin(a * 0.785) * REACH))) return { x, z };
  }
  return { x: 0, z: LAKE_CENTER_Z };
}

export type SmokePuff = Point & {
  /** Its width, in metres. */
  size: number;
  /** How thick it is, 0 clear to THICKEST. */
  alpha: number;
};

/** Puff `puff` of wisp `index` at `time`, drifting with `wind`. `still` holds each wisp half risen. */
export function smokePuffAt(index: number, puff: number, time: number, wind: { x: number; z: number }, still = false): SmokePuff {
  // Each wisp keeps its own beat, so they come and go at different moments.
  const t = still ? WISP_LIFE_SEC * 0.45 : time + hash(index + 0.3) * WISP_LIFE_SEC;
  const round = still ? 0 : Math.floor(t / WISP_LIFE_SEC);
  const age = still ? t : t - round * WISP_LIFE_SEC;
  const p = age / WISP_LIFE_SEC;
  const home = wispHome(index, round);
  const up = RISE * Math.sqrt(p) + puff * 0.28;
  // It leans downwind as it rises, more the stronger the breeze, and curls from side to side.
  const speed = Math.hypot(wind.x, wind.z);
  const lean = speed < 1e-4 ? 0 : (Math.min(MOST_LEAN, speed * 20) * up) / speed;
  const curl = Math.sin(age * 1.1 + index + puff * 0.9) * 0.18 * (1 + puff);
  const fade = Math.min(1, p / 0.18) * Math.min(1, (1 - p) / 0.4);
  return {
    x: home.x + wind.x * lean + curl,
    y: 0.08 + up,
    z: home.z + wind.z * lean + curl * 0.4,
    size: 0.7 + p * 1.1 + puff * 0.25,
    alpha: THICKEST * fade * (1 - puff * 0.28),
  };
}
