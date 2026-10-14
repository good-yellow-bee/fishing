import { inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type Sky as WeatherSky } from "@stillwater/shared";

/** Heights of the two mist sheets above still water. The chop peaks near 0.4, so the upper sheet rides over it. */
export const MIST_LAYERS = [0.15, 0.42] as const;
/** Half-width of one puff's soft quad, in meters. */
export const MIST_PUFF_SIZE = 3.4;
/** How far a puff drifts from its home before turning back. */
export const MIST_DRIFT = 1.1;

const STEP_X = 4.6;
const STEP_Z = 4.2;

export type MistPuff = { x: number; y: number; z: number; size: number; spin: number };

function hash(i: number) {
  const s = Math.sin(i * 91.7 + 47.3) * 43758.5453;
  return s - Math.floor(s);
}

/** True when every point the puff can drift to stays over water. */
function homeFits(x: number, z: number) {
  const reach = MIST_DRIFT + 0.4;
  return [0, 1, 2, 3, 4, 5, 6, 7].every((k) => {
    const a = (k / 8) * Math.PI * 2;
    return inLake(x + Math.cos(a) * reach, z + Math.sin(a) * reach);
  });
}

type Home = { x: number; z: number; layer: number; phase: number; size: number; spin: number };

const HOMES: Home[] = MIST_LAYERS.flatMap((_, layer) => {
  const homes: Home[] = [];
  for (let x = -LAKE_RX + layer * STEP_X * 0.5; x <= LAKE_RX; x += STEP_X) {
    for (let z = LAKE_CENTER_Z - LAKE_RZ + layer * STEP_Z * 0.5; z <= LAKE_CENTER_Z + LAKE_RZ; z += STEP_Z) {
      if (!homeFits(x, z)) continue;
      const seed = homes.length + layer * 200;
      homes.push({
        x,
        z,
        layer,
        phase: hash(seed),
        size: MIST_PUFF_SIZE * (0.8 + hash(seed + 13) * 0.45),
        spin: hash(seed + 29) * Math.PI * 2,
      });
    }
  }
  return homes;
});

export const MIST_COUNT = HOMES.length;

/**
 * How thick the mist lies: a morning blanket at dawn, the whole day in fog,
 * nothing otherwise. Rain beats mist off the water.
 */
export function mistAmount(hour: LakeHour, sky: WeatherSky) {
  if (sky === "rain") return 0;
  if (sky === "fog") return hour === "dawn" ? 0.42 : 0.34;
  if (hour === "dawn") return sky === "clear" ? 0.24 : 0.2;
  return 0;
}

/** One puff at `time`: it drifts east and back along a slow loop, never leaving the water. */
export function mistPuff(index: number, time: number, still = false): MistPuff {
  const home = HOMES[((index % MIST_COUNT) + MIST_COUNT) % MIST_COUNT]!;
  const t = still ? 0 : time;
  const a = t * 0.045 + home.phase * Math.PI * 2;
  return {
    x: home.x + Math.sin(a) * MIST_DRIFT,
    z: home.z + Math.sin(a * 0.7 + 1.3) * MIST_DRIFT * 0.4,
    y: MIST_LAYERS[home.layer]!,
    size: home.size,
    spin: home.spin + t * 0.012,
  };
}

/** Meters around the camera where mist thins out, so it never films over the angler's own water and fish shadows. */
export const MIST_CLEAR_NEAR = 5;
export const MIST_CLEAR_FAR = 11;

/** 0 right under the camera, 1 past MIST_CLEAR_FAR. */
export function mistNearFade(dx: number, dz: number) {
  const t = Math.min(1, Math.max(0, (Math.hypot(dx, dz) - MIST_CLEAR_NEAR) / (MIST_CLEAR_FAR - MIST_CLEAR_NEAR)));
  return t * t * (3 - 2 * t);
}
