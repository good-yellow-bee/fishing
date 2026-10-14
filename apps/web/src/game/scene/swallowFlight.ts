import { LAKE_CENTER_Z, inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/** Swallows hawk low over the lake on warm, dry summer days; rain and anything above a light breeze keep them away. */
export function swallowsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, windSpeed: number): boolean {
  return season === "summer" && hour === "day" && (sky === "clear" || sky === "partly-cloudy") && windSpeed <= SWALLOW_MAX_WIND;
}

/** The fastest drift (meters a second, as WIND_DRIFT gives it) they still fly in: calm and the light winds. */
export const SWALLOW_MAX_WIND = 0.05;
/** Swallows over the lake; Lite effects keep the first half. */
export const SWALLOW_COUNT = 6;
/** The lowest they fly, skimming the water, and the top of their swoop. */
export const SWALLOW_LOW = 0.1;
export const SWALLOW_HIGH = 2.6;

export type SwallowPose = { x: number; y: number; z: number; yaw: number; bank: number; flap: number };

function hash(i: number) {
  const s = Math.sin(i * 39.7 + 5.3) * 43758.5453;
  return s - Math.floor(s);
}

const BIRDS = Array.from({ length: SWALLOW_COUNT }, (_, i) => ({
  // A long loop over the middle of the lake, each bird with its own size, speed, direction and swoop rhythm.
  cx: (hash(i + 1) - 0.5) * 10,
  cz: LAKE_CENTER_Z + 2.5 + (hash(i + 2) - 0.5) * 3,
  rx: 5 + hash(i + 3) * 6,
  rz: 2.5 + hash(i + 4) * 3,
  speed: (0.28 + hash(i + 5) * 0.16) * (hash(i + 6) < 0.5 ? -1 : 1),
  phase: hash(i + 7) * Math.PI * 2,
  swoop: 1.6 + hash(i + 8) * 1.4,
}));

function place(bird: (typeof BIRDS)[number], t: number) {
  const a = t * bird.speed + bird.phase;
  // Up into a swoop and down to skim the water: low most of the loop, sharp dips to the surface.
  const lift = 0.5 + 0.5 * Math.sin(a * bird.swoop);
  return {
    x: bird.cx + Math.cos(a) * bird.rx,
    y: SWALLOW_LOW + (SWALLOW_HIGH - SWALLOW_LOW) * lift ** 1.6,
    z: bird.cz + Math.sin(a) * bird.rz,
  };
}

/** Swallow `index` at `time`. `still` holds it gliding in place, for reduced motion. */
export function swallowAt(index: number, time: number, still = false): SwallowPose {
  const bird = BIRDS[((index % SWALLOW_COUNT) + SWALLOW_COUNT) % SWALLOW_COUNT]!;
  const t = still ? 0 : time;
  const before = place(bird, t - 0.08);
  const here = place(bird, t);
  const ahead = place(bird, t + 0.08);
  const yaw = Math.atan2(ahead.x - here.x, ahead.z - here.z);
  const yawBefore = Math.atan2(here.x - before.x, here.z - before.z);
  // Lean into the turn: the sharper the swing of heading, the steeper the bank.
  const turn = Math.atan2(Math.sin(yaw - yawBefore), Math.cos(yaw - yawBefore));
  const bank = Math.max(-0.9, Math.min(0.9, -turn * 12));
  // A burst of quick beats, then a glide on swept wings.
  const beating = !still && Math.sin(time * 1.3 + bird.phase) > 0.2;
  const flap = beating ? Math.sin(time * 7 * Math.PI * 2 + index) : 0;
  return { ...here, yaw, bank, flap };
}

export function swallowOverWater(pose: SwallowPose) {
  return inLake(pose.x, pose.z);
}
