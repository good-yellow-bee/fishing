import { inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Dancing midges: on still evenings in late spring and summer little clouds of midges hang over
 * the water in front of the dock, each midge darting to and fro inside its cloud while the whole
 * cloud bobs slowly up and down and leans with any breath of wind, catching the low sun so they
 * glint. Pure in time.
 */

/** At dusk in late spring and summer, when it is dry and nearly still. */
export function midgesOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "dusk" && (season === "spring" || season === "summer") && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) < STILL_AIR;
}

/** Above this drift the clouds are blown apart. */
export const STILL_AIR = 0.12;
/** Where the clouds hang, over the water a few metres in front of the dock and off to either side, and how high. */
export const MIDGE_CLOUDS = [
  { x: -2.6, z: 3.4, y: 1.2 },
  { x: 2.9, z: 2.3, y: 1.5 },
  { x: -5.2, z: 0.6, y: 1.15 },
];
export const MIDGES_PER_CLOUD = 60;
/** A cloud's half-width and half-height. */
const SPREAD = 0.32;
const TALL = 0.45;
/** How far a cloud bobs up and down, and how long one bob takes. */
const BOB = 0.35;
const BOB_SEC = 6;
/** How far each metre a second of drift leans a cloud downwind. */
const LEAN = 6;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Midge = { x: number; y: number; z: number; glint: number };

/** Midge `i` of cloud `c` at `time`, above the water's rest level. `still` holds them where they were at one moment. */
export function midgeAt(c: number, i: number, time: number, wind: { x: number; z: number }, still = false): Midge {
  const cloud = MIDGE_CLOUDS[c]!;
  const t = still ? 8 : time;
  const seed = c * 1000 + i * 7;
  const bob = BOB * Math.sin((2 * Math.PI * t) / BOB_SEC + c * 2.1);
  // Each one darts on its own little figure, fast and jittery.
  const fx = 1.3 + hash(seed) * 1.6;
  const fy = 1.8 + hash(seed + 1) * 2.2;
  const fz = 1.1 + hash(seed + 2) * 1.4;
  const px = hash(seed + 3) * Math.PI * 2;
  const py = hash(seed + 4) * Math.PI * 2;
  const pz = hash(seed + 5) * Math.PI * 2;
  const r = 0.4 + 0.6 * hash(seed + 6);
  return {
    x: cloud.x + wind.x * LEAN + SPREAD * r * Math.sin(fx * t + px) * Math.cos(0.7 * t + pz),
    y: cloud.y + bob + TALL * r * Math.sin(fy * t + py),
    z: cloud.z + wind.z * LEAN + SPREAD * r * Math.sin(fz * t + pz),
    // A wing flash now and then as it turns in the low sun.
    glint: still ? 0.6 : 0.35 + 0.65 * Math.max(0, Math.sin(t * (6 + hash(seed + 7) * 5) + px)) ** 4,
  };
}

/** Every cloud's spot is over water. */
export function cloudsOverWater() {
  return MIDGE_CLOUDS.every((cloud) => inLake(cloud.x, cloud.z));
}
