import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * Butterflies on sunny summer days: a few flutter low over the lily pads and
 * the water near the dock, each wandering round its own spot in loose,
 * looping drifts with a bobbing, flapping flight. Pure functions of time.
 */
export const BUTTERFLY_HOMES = [
  { x: -7.6, z: 5.1 },
  { x: 8.4, z: -8.0 },
  { x: -11.4, z: -5.4 },
  { x: 2.6, z: 3.4 },
  { x: -2.8, z: 2.2 },
  { x: 5.2, z: 1.0 },
] as const;
export const BUTTERFLY_COLORS = ["#f2c94c", "#f08a3c", "#f5f1e6", "#7fb3e8"] as const;
/** How far each strays from its spot, and its height band over the water. */
const ROAM = 1.8;
const LOW = 0.45;
const BOB = 0.35;

export function butterfliesOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season === "summer" && hour === "day" && (sky === "clear" || sky === "partly-cloudy");
}

function unit(i: number, salt: number) {
  const s = Math.sin(i * 57.3 + salt * 13.1) * 43758.5453;
  return s - Math.floor(s);
}

function spot(i: number, t: number) {
  const home = BUTTERFLY_HOMES[i % BUTTERFLY_HOMES.length]!;
  const a = unit(i, 1) * Math.PI * 2;
  const b = unit(i, 2) * Math.PI * 2;
  const slow = 0.3 + unit(i, 3) * 0.15;
  return {
    x: home.x + ROAM * Math.sin(t * slow + a) + 0.5 * Math.sin(t * 1.7 + b),
    y: LOW + BOB * (0.5 + 0.5 * Math.sin(t * 0.8 + b)) + 0.07 * Math.abs(Math.sin(t * 9 + a)),
    z: home.z + ROAM * 0.7 * Math.sin(t * slow * 1.3 + b) + 0.5 * Math.cos(t * 1.4 + a),
  };
}

export type Butterfly = { x: number; y: number; z: number; yaw: number; flap: number; color: number };

/** Butterfly `i` at `time`: where it is, which way it heads, and its wings' beat (0 shut overhead, 1 spread flat). */
export function butterflyAt(i: number, time: number): Butterfly {
  const now = spot(i, time);
  const next = spot(i, time + 0.05);
  const rate = 16 + unit(i, 4) * 6;
  return {
    ...now,
    yaw: Math.atan2(next.x - now.x, next.z - now.z),
    flap: 0.5 + 0.5 * Math.sin(time * rate),
    color: i % BUTTERFLY_COLORS.length,
  };
}
