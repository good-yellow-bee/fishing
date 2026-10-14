import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";

/** Where the thermos stands: on the planks just behind the angler's right hand, and its cup beside it. */
export const THERMOS_SPOT = { x: DOCK_STAND_X + 0.46, y: DOCK_PLANKS.top, z: DOCK_STAND_Z + 0.55 } as const;
export const CUP_SPOT = { x: THERMOS_SPOT.x - 0.17, y: DOCK_PLANKS.top, z: THERMOS_SPOT.z + 0.08 } as const;
export const CUP_HEIGHT = 0.08;

/** Blobs in the wisp, and how long each one takes to rise and fade. */
export const STEAM_BLOBS = 7;
export const STEAM_LIFE_SEC = 2.6;
const RISE = 0.42;

function unit(n: number) {
  const s = Math.sin(n * 41.3 + 7.9) * 43758.5453;
  return s - Math.floor(s);
}

export type SteamBlob = { x: number; y: number; z: number; scale: number; opacity: number };

/** Blob `i` of the wisp at `time`, in metres from the cup's rim: it rises, curls side to side, swells and thins away. */
export function steamBlob(i: number, time: number): SteamBlob {
  const shifted = time + (i / STEAM_BLOBS) * STEAM_LIFE_SEC;
  const age = (shifted % STEAM_LIFE_SEC) / STEAM_LIFE_SEC;
  const round = Math.floor(shifted / STEAM_LIFE_SEC);
  const lean = unit(round * 7 + i) - 0.5;
  const curl = Math.sin(age * Math.PI * 2 + unit(i) * 6) * 0.03 * age;
  return {
    x: curl + lean * 0.08 * age,
    y: age * RISE,
    z: lean * 0.04 * age,
    scale: 0.018 + age * 0.05,
    opacity: Math.min(1, age * 5) * (1 - age),
  };
}
