import { keepLureInWater, lureClearsDock } from "./fightMotion";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

/** Ring lifetime. Shorter than the shortest hook window, so a miss does not inherit it. */
export const STRIKE_RING_SEC = 0.62;

/** Spray lifetime. It is gone while the ring is still opening. */
export const STRIKE_SPRAY_SEC = 0.36;

/** Dunk lifetime. The bobber is back up before a missed window can pop it. */
export const STRIKE_DUNK_SEC = 0.48;

/** Meters under the resting float at the bottom of the take. */
export const STRIKE_DUNK_M = 0.48;

/** Meters the ring and the spray ride above the chop. Same placement as the rain rings. */
export const STRIKE_RING_LIFT = 0.14;

export const STRIKE_DROPS = 8;

/** Open water just lakeward of the dock lip. The shrink starts here. */
const LAKEWARD_Z = 4.6;

export type StrikeRing = {
  x: number;
  y: number;
  z: number;
  radius: number;
  open: number;
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

function onBite(phase: ScenePhase, age: number, limit: number) {
  return phase === "hookset" && age >= 0 && age < limit;
}

/** Expanding ring on the chop. Null outside the bite window. */
export function strikeRing(phase: ScenePhase, age: number, x: number, z: number, time: number): StrikeRing | null {
  if (!onBite(phase, age, STRIKE_RING_SEC)) return null;
  const open = age / STRIKE_RING_SEC;
  const spot = strikeAnchor(x, z);
  return {
    x: spot.x,
    y: waterHeight(spot.x, spot.z, time) + STRIKE_RING_LIFT,
    z: spot.z,
    radius: 1.15 + open * 3.2,
    open,
  };
}

/** Burst strength at the same point as the ring. Null once the spray has died. */
export function strikeSpray(phase: ScenePhase, age: number, x: number, z: number, time: number): StrikeSpray | null {
  if (!onBite(phase, age, STRIKE_SPRAY_SEC)) return null;
  const spot = strikeAnchor(x, z);
  return {
    x: spot.x,
    y: waterHeight(spot.x, spot.z, time) + STRIKE_RING_LIFT,
    z: spot.z,
    strength: 1 - age / STRIKE_SPRAY_SEC,
  };
}

/** One droplet of the burst, in meters around the splash point. Null when the spray is off. */
export function strikeDrop(phase: ScenePhase, index: number, age: number): StrikeDrop | null {
  if (!onBite(phase, age, STRIKE_SPRAY_SEC)) return null;
  const u = age / STRIKE_SPRAY_SEC;
  const i = ((index % STRIKE_DROPS) + STRIKE_DROPS) % STRIKE_DROPS;
  const angle = (i / STRIKE_DROPS) * Math.PI * 2 + 0.35;
  const spread = 0.16 + u * 1.25;
  const rise = u < 0.24 ? 0.55 + (u / 0.24) * 0.45 : (1 - u) / 0.76;
  return {
    x: Math.cos(angle) * spread,
    y: Math.max(0, rise) * (1.15 + (i % 3) * 0.45),
    z: Math.sin(angle) * spread,
    opacity: (1 - u) * 0.95,
  };
}

/**
 * Meters the bobber is pulled under the chop.
 * Peaks early in the window, then returns so a miss can play its own pop.
 */
export function strikeDunk(phase: ScenePhase, age: number) {
  if (!onBite(phase, age, STRIKE_DUNK_SEC)) return 0;
  const u = age / STRIKE_DUNK_SEC;
  const down = u < 0.32 ? u / 0.32 : (1 - u) / 0.68;
  return Math.sin(Math.min(1, down) * (Math.PI / 2)) * STRIKE_DUNK_M;
}
