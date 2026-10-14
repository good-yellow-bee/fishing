import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeSeason } from "@stillwater/shared";

/**
 * Autumn leaves: each one lets go from a shore tree, spins down onto the shallows, drifts with the day's wind,
 * and sinks. Every leaf runs its own staggered cycle as a pure function of time, so tests and screenshots agree.
 */
export const LEAF_COUNT = 60;
export const LEAF_FALL_SEC = 5;
export const LEAF_FLOAT_SEC = 12;
export const LEAF_SINK_SEC = 1.5;
/** A leaf's whole cycle; the rest of it, it is off the tree and out of sight. */
export const LEAF_CYCLE_SEC = 26;
/** Where in the canopy it lets go, meters over the water. */
export const LEAF_TOP = 4.2;
/** From the bank under the trees out over the shallows, as shares of the lake's radius. */
const LEAF_FROM = 1.07;
const LEAF_TO = 0.92;
/** Two leaves in three ride the wind well out over the water, so some come down in view of whichever bank you fish. */
const BLOWN_NEAREST = 0.45;
const BLOWN_SPREAD = 0.4;
const BLOWN_CARRY = 0.12;
/** How far a leaf on the water moves for each meter a second of the day's wind drift, per second. */
const WIND_PUSH = 1.4;

export const LEAF_COLORS = ["#d9822b", "#c2452d", "#e0b13a", "#a8532a"] as const;

export type Leaf = {
  x: number;
  z: number;
  /** Meters above the water's surface. */
  height: number;
  /** Turn about the vertical, and the tumble as it falls (0 once it lies flat). */
  spin: number;
  tilt: number;
  /** 1 full size, shrinking to 0 as it sinks. */
  size: number;
  color: number;
};

export function leavesOut(season: LakeSeason) {
  return season === "fall";
}

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function along(angle: number, reach: number) {
  return { x: Math.cos(angle) * LAKE_RX * reach, z: LAKE_CENTER_Z + Math.sin(angle) * LAKE_RZ * reach };
}

/** The leaf at `time`, or null while it is still on the tree. */
export function leafAt(index: number, time: number, wind: { x: number; z: number }): Leaf | null {
  const offset = hash(index) * LEAF_CYCLE_SEC;
  const into = (((time + offset) % LEAF_CYCLE_SEC) + LEAF_CYCLE_SEC) % LEAF_CYCLE_SEC;
  if (into >= LEAF_FALL_SEC + LEAF_FLOAT_SEC + LEAF_SINK_SEC) return null;
  // Each fall picks a fresh spot round the shore.
  const round = Math.floor((time + offset) / LEAF_CYCLE_SEC);
  const angle = hash(index * 31 + round * 7) * Math.PI * 2;
  const blown = index % 3 !== 0;
  const landing = blown ? BLOWN_NEAREST + hash(index * 17 + round * 3) * BLOWN_SPREAD : LEAF_TO;
  const from = along(angle, blown ? landing + BLOWN_CARRY : LEAF_FROM);
  const to = along(angle, landing);
  const flutter = hash(index + 5) * Math.PI * 2;
  const color = Math.floor(hash(index + 11) * LEAF_COLORS.length);
  if (into < LEAF_FALL_SEC) {
    const k = into / LEAF_FALL_SEC;
    // Swings side to side across its line as it drops, slowing a little near the water.
    const sway = Math.sin(into * 2.6 + flutter) * 0.45;
    const across = { x: -(to.z - from.z), z: to.x - from.x };
    const span = Math.hypot(across.x, across.z) || 1;
    return {
      x: from.x + (to.x - from.x) * k + (across.x / span) * sway,
      z: from.z + (to.z - from.z) * k + (across.z / span) * sway,
      height: LEAF_TOP * (1 - k) * (1 - k * 0.3),
      spin: into * 2.2 + flutter,
      tilt: Math.sin(into * 3.4 + flutter) * 0.9,
      size: 1,
      color,
    };
  }
  const afloat = into - LEAF_FALL_SEC;
  const sinking = Math.max(0, afloat - LEAF_FLOAT_SEC) / LEAF_SINK_SEC;
  return {
    x: to.x + wind.x * WIND_PUSH * afloat,
    z: to.z + wind.z * WIND_PUSH * afloat,
    height: 0,
    spin: LEAF_FALL_SEC * 2.2 + flutter + afloat * 0.05,
    tilt: 0,
    size: 1 - Math.min(1, sinking),
    color,
  };
}
