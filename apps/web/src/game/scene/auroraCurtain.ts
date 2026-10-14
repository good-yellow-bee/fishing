import { inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Northern lights: a green curtain low over the far treeline on some clear
 * fall and winter nights. The dock looks down at the lake more than up, so
 * the curtain's mirror in the water carries most of it.
 */

/** About one night in this many has the lights, when the sky and season allow. */
export const AURORA_ODDS = 3;
/** Columns along the curtain. */
export const AURORA_COLUMNS = 56;
/** Meters from the dock to the curtain, inside the sky dome, and how far round it reaches either side. */
const RADIUS = 78;
const SPREAD = 0.95;
/** The curtain's foot, behind the far hills, and its shortest and extra height. */
export const AURORA_BASE = 8;
const HEIGHT = 12;
const HEIGHT_SWING = 9;
/** Seconds to brighten from nothing. */
export const AURORA_FADE_IN = 20;
export const AURORA_PEAK = 0.55;
export const AURORA_REFLECTION = 0.8;

/** FNV-1a on the local day with a salt, so each night has its own answer and the lights hold all night. */
function nightHash(date: Date) {
  const key = `aurora:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function auroraOut(date: Date, hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  if (hour !== "night" || sky !== "clear") return false;
  if (season !== "fall" && season !== "winter") return false;
  return nightHash(date) % AURORA_ODDS === 0;
}

export function auroraOpacity(seconds: number) {
  return AURORA_PEAK * Math.min(1, Math.max(0, seconds / AURORA_FADE_IN));
}

export type CurtainColumn = { x: number; z: number; top: number; glow: number };

/** One column of the curtain at `time`: where it stands, how tall it reaches, and how bright it burns (0..1). */
export function curtainColumn(c: number, time: number): CurtainColumn {
  const u = c / (AURORA_COLUMNS - 1);
  const angle = (u * 2 - 1) * SPREAD + Math.sin(c * 0.31 + time * 0.23) * 0.012;
  const lift = 0.5 + 0.5 * Math.sin(c * 0.23 + time * 0.15);
  const wave = Math.sin(c * 0.45 + time * 0.35) * Math.sin(c * 0.17 - time * 0.21);
  // Thin rays brighten and fade along the folds.
  const rays = 0.5 + 0.5 * Math.sin(c * 1.3 + time * 0.6);
  // The ends fade, so the curtain hangs in the sky rather than stopping at a cut.
  const ends = Math.sin(u * Math.PI);
  return {
    x: Math.sin(angle) * RADIUS,
    z: -Math.cos(angle) * RADIUS,
    top: AURORA_BASE + HEIGHT + HEIGHT_SWING * lift,
    glow: Math.min(1, Math.max(0, 0.35 + 0.65 * wave)) * (0.45 + 0.55 * rays) * ends,
  };
}

/** Where a sky point shows in the still lake for an eye at `eye`; `wet` is false where that lands off the water. */
export function curtainReflection(point: readonly [number, number, number], eye: { x: number; y: number; z: number }) {
  const [px, py, pz] = point;
  const t = eye.y / (eye.y + Math.max(py, 0.5));
  const x = eye.x + (px - eye.x) * t;
  const z = eye.z + (pz - eye.z) * t;
  return { x, z, wet: eye.y > 0 && py > 0 && inLake(x, z) };
}
