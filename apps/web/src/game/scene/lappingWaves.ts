import { LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * Little waves lapping at the shore: the white line of foam along the waterline washes out over the
 * water and draws back, wave after wave running along the bank. On the bank the day's wind blows
 * onto the wash is wider and the foam thicker; on the sheltered bank across the lake it barely
 * stirs. Pure in time.
 */

/** The drift (m/s) of a full breeze, as the windsock's. */
const FULL_WIND = 0.13;
/** Seconds between one wave and the next reaching the shore. */
export const LAP_SEC = 3.2;
/** Waves along the whole shore at once, so each one runs along the bank. */
const WAVES_ROUND = 22;
/** How far a wave washes out over the water on a calm day and at most on the windward bank, in metres. */
const CALM_WASH = 0.05;
const MAX_WASH = 0.42;

/** Which way is straight out from the lake at a point `angle` round its edge (as LakeWorld's shore rings are laid), in world x and z. */
export function shoreOutward(angle: number) {
  const x = Math.cos(angle) / LAKE_RX;
  // The rings are drawn in the shape's plane and turned flat, so the shape's +y is the world's -z.
  const z = -Math.sin(angle) / LAKE_RZ;
  const len = Math.hypot(x, z);
  return { x: x / len, z: z / len };
}

/** How much the wind blows onto the bank at `angle`: 1 straight onto it at full strength, 0 sheltered or calm. */
export function onshore(angle: number, wind: { x: number; z: number }) {
  const speed = Math.hypot(wind.x, wind.z);
  if (speed < 1e-6) return 0;
  const out = shoreOutward(angle);
  const facing = (out.x * wind.x + out.z * wind.z) / speed;
  return Math.max(0, facing) * Math.min(1, speed / FULL_WIND);
}

/** The foam's strength by the hour and season: faint at night, and none in winter, when ice rims the shore. */
export function foamOpacity(hour: LakeHour, season: LakeSeason) {
  if (season === "winter") return 0;
  return hour === "night" ? 0.1 : 0.38;
}

export type Wash = {
  /** How far the foam reaches out over the water past its resting line, in metres. */
  reach: number;
  /** How thick the foam is, as a share of the full opacity. */
  thickness: number;
};

/** The wash at a point `angle` round the shore, `time` seconds in. `still` holds each bank at its middle reach. */
export function washAt(angle: number, wind: { x: number; z: number }, time: number, still = false): Wash {
  const blow = onshore(angle, wind);
  const span = CALM_WASH + (MAX_WASH - CALM_WASH) * blow;
  // A wave runs in fast and drains back slowly, so the lap is skewed rather than a plain swing.
  const phase = still ? 0.5 : ((((time / LAP_SEC - (angle * WAVES_ROUND) / (Math.PI * 2)) % 1) + 1) % 1);
  const lap = phase < 0.3 ? Math.sin((phase / 0.3) * (Math.PI / 2)) : 0.5 + 0.5 * Math.cos(((phase - 0.3) / 0.7) * Math.PI);
  return { reach: span * lap, thickness: 0.7 + 0.6 * blow * (0.6 + 0.4 * lap) };
}
