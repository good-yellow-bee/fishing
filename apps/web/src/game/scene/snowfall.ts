import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";

/** Flakes in the air at once; Lite effects keep every other one. */
export const SNOW_COUNT = 1400;
/** Where flakes start and stop: from above the trees down to the ground. */
export const SNOW_TOP = 8;
/** Meters a second, slowest and fastest; snow drifts, it doesn't fall like rain. */
export const SNOW_FALL = [0.55, 0.95] as const;
/** How far a flake sways side to side as it comes down. */
export const SNOW_SWAY = 0.35;
/** How far the wind carries a flake sideways for each metre it falls, per m/s of the day's drift: snow falls slowly, so a strong wind drives it at a slant of about 33 degrees. */
export const SNOW_LEAN = 5;
/** The flurry reaches this far past the water, over the shore the angler stands on. */
const SHORE_MARGIN = 6;

export type Flake = { x: number; y: number; z: number };

/** A fixed 0..1 for a flake and a salt, so the flurry is the same every visit. */
function unit(index: number, salt: number) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const NO_WIND = { x: 0, z: 0 };

/** Where flake `index` is at `time`: drifting down on a loop, swaying on its own beat, and carried down the day's `wind` as it falls. */
export function snowFlake(index: number, time: number, wind = NO_WIND): Flake {
  const speed = SNOW_FALL[0] + unit(index, 1) * (SNOW_FALL[1] - SNOW_FALL[0]);
  const loop = SNOW_TOP / speed;
  const u = ((time / loop + unit(index, 2)) % 1 + 1) % 1;
  const sway = Math.sin(time * (0.6 + unit(index, 3) * 0.8) + unit(index, 4) * Math.PI * 2) * SNOW_SWAY;
  const y = SNOW_TOP * (1 - u);
  return {
    x: (unit(index, 5) * 2 - 1) * (LAKE_RX + SHORE_MARGIN) + sway - wind.x * SNOW_LEAN * y,
    y,
    z: LAKE_CENTER_Z + (unit(index, 6) * 2 - 1) * (LAKE_RZ + SHORE_MARGIN) + sway * 0.6 - wind.z * SNOW_LEAN * y,
  };
}
