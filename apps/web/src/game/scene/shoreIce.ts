import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason } from "@stillwater/shared";

/** Points round the rim; enough that the ragged edge reads as ragged, not as a polygon. */
export const RIM_STEPS = 360;
/** The rim ice's width off the bank, in metres, at its narrowest and widest. */
export const RIM_MIN = 1.0;
export const RIM_MAX = 3.0;
/** The snow-lit band nearest the bank: solid ice from under the bank's edge this far out, in metres. */
export const SNOW_BAND = 0.6;
/** Broken plates loose off the rim's edge. */
export const SHARD_COUNT = 90;
/** Lit by the sky like the other films: bright by day, dull at dawn and dusk, barely there at night. */
export const ICE_LIGHT: Record<LakeHour, number> = { dawn: 0.75, day: 1, dusk: 0.55, night: 0.2 };

/** A rim of ice skirts the bank all winter; it is gone by spring. */
export function shoreIceOut(season: LakeSeason) {
  return season === "winter";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** The bank's line at `angle` round the lake (the water's own rim), in world x-z, and its distance from the lake's middle. */
function bank(angle: number) {
  const edge = lakeEdge(angle);
  const x = Math.cos(angle) * LAKE_RX * edge;
  const z = LAKE_CENTER_Z + Math.sin(angle) * LAKE_RZ * edge;
  return { x, z, reach: Math.hypot(x, z - LAKE_CENTER_Z) };
}

/** How wide the ice reaches off the bank at `angle`: wider in the coves, narrow on the points, ragged throughout. */
export function rimWidth(angle: number) {
  const swell = 0.5 + 0.3 * Math.sin(angle * 5 + 1.1) + 0.2 * Math.sin(angle * 11 + 0.4);
  const ragged = (seeded(Math.round((angle / (Math.PI * 2)) * RIM_STEPS), 1) - 0.5) * 0.18;
  return Math.min(RIM_MAX, Math.max(RIM_MIN, RIM_MIN + (RIM_MAX - RIM_MIN) * swell + ragged));
}

export type RimPoint = { bank: { x: number; z: number }; edge: { x: number; z: number } };

/** The rim, once round the lake: each step's point on the bank and where the ice ends out on the water. */
export function shoreIceRim(): RimPoint[] {
  return Array.from({ length: RIM_STEPS }, (_, i) => {
    const angle = (i / RIM_STEPS) * Math.PI * 2;
    const at = bank(angle);
    const keep = 1 - rimWidth(angle) / at.reach;
    return {
      bank: { x: at.x, z: at.z },
      edge: { x: at.x * keep, z: LAKE_CENTER_Z + (at.z - LAKE_CENTER_Z) * keep },
    };
  });
}

export type Shard = { x: number; z: number; size: number; turn: number };

/** Loose plates broken off the rim, lying just off its edge. */
export function iceShards(): Shard[] {
  return Array.from({ length: SHARD_COUNT }, (_, i) => {
    const angle = seeded(i, 2) * Math.PI * 2;
    const at = bank(angle);
    const out = rimWidth(angle) + 0.15 + seeded(i, 3) * 1.2;
    const keep = 1 - out / at.reach;
    return {
      x: at.x * keep,
      z: LAKE_CENTER_Z + (at.z - LAKE_CENTER_Z) * keep,
      size: 0.15 + seeded(i, 4) * 0.3,
      turn: seeded(i, 5) * Math.PI,
    };
  });
}
