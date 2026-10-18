import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake } from "@stillwater/shared";
import { WHITECAP_MIN_WIND } from "./whitecapLife";
import { waterDepth } from "./water";

/** Meters between neighbouring lanes, across the wind. */
export const LANE_GAP = 3.4;
/** The drift at which the lanes are as thick and long as they get. */
const FULL_WIND = 0.13;
/** Lanes form out on the open water, not over the shelf. */
const MIN_DEPTH = 0.25;
/** Meters between the points that trace a lane. */
const STEP = 0.6;

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * How strongly the wind combs foam into lanes: none below the breeze that breaks whitecaps,
 * rising to full in a strong wind.
 */
export function foamLanesAmount(windSpeed: number) {
  if (windSpeed < WHITECAP_MIN_WIND) return 0;
  return Math.min(1, (windSpeed - WHITECAP_MIN_WIND) / (FULL_WIND - WHITECAP_MIN_WIND) * 0.7 + 0.3);
}

export type FoamDash = { points: { x: number; z: number }[]; width: number; alpha: number };

/**
 * Wind lanes: thin streaks of foam lying in long parallel lines down the wind, the way a stiff
 * breeze rakes the scum from broken crests into rows. Each lane is broken into dashes, longer and
 * more of them the stronger the wind, wavering a little across. Every point is on open water.
 */
export function foamLanes(wind: { x: number; z: number }): FoamDash[] {
  const speed = Math.hypot(wind.x, wind.z);
  const amount = foamLanesAmount(speed);
  if (amount === 0) return [];
  const head = { x: wind.x / speed, z: wind.z / speed };
  const side = { x: -head.z, z: head.x };
  // Wide enough to sweep the whole lake whichever way the wind blows.
  const reach = Math.hypot(LAKE_RX, LAKE_RZ);
  const dashes: FoamDash[] = [];
  const lanes = Math.floor((reach * 2) / LANE_GAP);
  for (let lane = 0; lane <= lanes; lane += 1) {
    const offset = -reach + lane * LANE_GAP + (seeded(lane, 1) - 0.5) * LANE_GAP * 0.5;
    const wobble = 0.15 + seeded(lane, 2) * 0.3;
    const phase = seeded(lane, 3) * Math.PI * 2;
    let current: { x: number; z: number }[] = [];
    let dash = 0;
    const flush = () => {
      if (current.length >= 3) {
        const k = lane * 31 + dash;
        dashes.push({ points: current, width: 0.16 + seeded(k, 4) * 0.16, alpha: (0.5 + seeded(k, 5) * 0.4) * amount });
      }
      current = [];
      dash += 1;
    };
    for (let along = -reach; along <= reach; along += STEP) {
      const step = Math.round((along + reach) / STEP);
      // The lane breaks up where the foam has thinned out; a stronger wind keeps more of it joined.
      const gap = seeded(lane * 97 + Math.floor(step / 5), 6) > 0.35 + 0.45 * amount;
      const sway = Math.sin(along * 0.35 + phase) * wobble;
      const x = side.x * (offset + sway) + head.x * along;
      const z = LAKE_CENTER_Z + side.z * (offset + sway) + head.z * along;
      if (gap || !inLake(x, z) || waterDepth(x, z) < MIN_DEPTH) {
        flush();
        continue;
      }
      current.push({ x, z });
    }
    flush();
  }
  return dashes;
}
