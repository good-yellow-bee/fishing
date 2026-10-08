import { keepLureInWater, lureClearsDock } from "./fightMotion";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

/** Seconds the ring takes to open. It then holds until the hookset phase ends. */
export const STRIKE_RING_OPEN_SEC = 0.48;

/** Seconds the spray takes to burst. The drops then hold until the hookset ends. */
export const STRIKE_SPRAY_SEC = 0.4;

/**
 * Dunk is back at the surface before the shortest hook window.
 * A miss can pop the bobber without a second splash still pulling it under.
 */
export const STRIKE_DUNK_SEC = 0.68;

/** Meters under the resting float at the bottom of the take. */
export const STRIKE_DUNK_M = 0.48;

/** Meters the ring and the spray ride above the chop. Same placement as the rain rings. */
export const STRIKE_RING_LIFT = 0.14;

/** White rim stays this bright for the whole hookset, so a still can catch it. */
export const STRIKE_RING_OPACITY = 0.92;

export const STRIKE_DROPS = 8;

/** Open water just lakeward of the dock lip. The shrink starts here. */
const LAKEWARD_Z = 4.6;

const RING_RADIUS_START = 1.2;
const RING_RADIUS_END = 3.35;

export type StrikeRing = {
  x: number;
  y: number;
  z: number;
  radius: number;
  open: number;
  opacity: number;
};

export type StrikeSpray = {
  x: number;
  y: number;
  z: number;
  strength: number;
};

export type StrikeDrop = {
  x: number;
  y: number;
  z: number;
  opacity: number;
};

/** Pull a strike off the planks with the same pad the waiting bobber uses. */
export function strikeAnchor(x: number, z: number) {
  if (lureClearsDock(x, z)) return { x, z };
  const pulled = keepLureInWater(x, Math.min(z, LAKEWARD_Z), x, z);
  if (lureClearsDock(pulled.x, pulled.z)) return pulled;
  const clearZ = Math.min(z, LAKEWARD_Z);
  return lureClearsDock(x, clearZ) ? { x, z: clearZ } : pulled;
}

function duringHookset(phase: ScenePhase, age: number) {
  return phase === "hookset" && age >= 0;
}

/** Expanding ring on the chop. Holds until the phase leaves the hookset. */
export function strikeRing(phase: ScenePhase, age: number, x: number, z: number, time: number): StrikeRing | null {
  if (!duringHookset(phase, age)) return null;
  const open = Math.min(1, age / STRIKE_RING_OPEN_SEC);
  const spot = strikeAnchor(x, z);
  return {
    x: spot.x,
    y: waterHeight(spot.x, spot.z, time) + STRIKE_RING_LIFT,
    z: spot.z,
    radius: RING_RADIUS_START + open * (RING_RADIUS_END - RING_RADIUS_START),
    open,
    opacity: STRIKE_RING_OPACITY,
  };
}

/** Burst strength at the same point as the ring. Holds a readable core after the burst. */
export function strikeSpray(phase: ScenePhase, age: number, x: number, z: number, time: number): StrikeSpray | null {
  if (!duringHookset(phase, age)) return null;
  const u = Math.min(1, age / STRIKE_SPRAY_SEC);
  const spot = strikeAnchor(x, z);
  return {
    x: spot.x,
    y: waterHeight(spot.x, spot.z, time) + STRIKE_RING_LIFT,
    z: spot.z,
    strength: Math.max(0.58, 1 - u * 0.42),
  };
}

/** One droplet of the burst, in meters around the splash point. Null when the hookset is over. */
export function strikeDrop(phase: ScenePhase, index: number, age: number): StrikeDrop | null {
  if (!duringHookset(phase, age)) return null;
  const u = Math.min(1, age / STRIKE_SPRAY_SEC);
  const i = ((index % STRIKE_DROPS) + STRIKE_DROPS) % STRIKE_DROPS;
  const angle = (i / STRIKE_DROPS) * Math.PI * 2 + 0.35;
  const spread = 0.16 + u * 1.25;
  const rise = u < 0.24 ? 0.55 + (u / 0.24) * 0.45 : (1 - u) / 0.76;
  const arc = Math.max(0, rise) * (1.15 + (i % 3) * 0.45);
  const settled = 0.42 + (i % 3) * 0.2;
  const held = age >= STRIKE_SPRAY_SEC;
  return {
    x: Math.cos(angle) * spread,
    y: held ? settled + Math.sin(age * 5 + i) * 0.08 : arc,
    z: Math.sin(angle) * spread,
    opacity: held ? 0.74 : Math.max(0.64, (1 - u) * 0.95),
  };
}

/**
 * Meters the bobber is pulled under the chop.
 * Holds through the take, then returns before a missed window can pop it.
 */
export function strikeDunk(phase: ScenePhase, age: number) {
  if (!duringHookset(phase, age) || age >= STRIKE_DUNK_SEC) return 0;
  const downEnd = 0.14;
  const holdEnd = 0.46;
  if (age <= downEnd) return Math.sin((age / downEnd) * (Math.PI / 2)) * STRIKE_DUNK_M;
  if (age <= holdEnd) return STRIKE_DUNK_M;
  const u = (age - holdEnd) / (STRIKE_DUNK_SEC - holdEnd);
  return Math.cos(Math.min(1, u) * (Math.PI / 2)) * STRIKE_DUNK_M;
}
