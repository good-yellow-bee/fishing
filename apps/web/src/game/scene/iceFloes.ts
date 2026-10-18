import { inLake, type LakeSeason } from "@stillwater/shared";
import { MOORING } from "./boat";
import { waterDepth } from "./water";

/** Plates of pancake ice afloat in the winter shallows. */
export const FLOE_COUNT = 34;
/** Floes form in the shallows near the bank, never out over the deep water. */
const MAX_DEPTH = 0.55;
/** How far a floe wanders from where it formed, in metres. */
const WANDER = 0.35;

/** Pancake ice floats in the shallows all winter. */
export function floesOut(season: LakeSeason) {
  return season === "winter";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Clear of the dock, its walkway and the angler's moored boat, so nothing sits inside them. */
function clearOfDock(x: number, z: number) {
  const pier = x > -1.2 && x < 1.2 && z > 4.8;
  const boat = Math.hypot(x - MOORING.x, z - MOORING.z) < 1.4;
  return !pier && !boat;
}

export type Floe = { x: number; z: number; radius: number; spin: number; phase: number };

/** Where each floe formed: scattered over the shallow shelf all round the lake, apart from one another. */
export function iceFloes(): Floe[] {
  const floes: Floe[] = [];
  for (let i = 0; floes.length < FLOE_COUNT && i < FLOE_COUNT * 60; i += 1) {
    const x = (seeded(i, 1) * 2 - 1) * 22;
    const z = -16 + seeded(i, 2) * 28;
    const radius = 0.25 + seeded(i, 3) * 0.35;
    // Keep the whole plate, wander included, on the shallow water.
    const reach = radius + WANDER;
    const edges = [[x + reach, z], [x - reach, z], [x, z + reach], [x, z - reach]] as const;
    if (!edges.every(([ex, ez]) => inLake(ex, ez) && clearOfDock(ex, ez))) continue;
    if (waterDepth(x, z) > MAX_DEPTH) continue;
    if (floes.some((f) => Math.hypot(f.x - x, f.z - z) < f.radius + radius + 2 * WANDER)) continue;
    floes.push({ x, z, radius, spin: (seeded(i, 4) - 0.5) * 0.08, phase: seeded(i, 5) * Math.PI * 2 });
  }
  return floes;
}

/**
 * Where a floe has drifted `time` seconds in: a slow wander about where it formed, nudged a
 * little downwind, turning lazily as it goes. Reduced motion leaves it where it formed.
 */
export function floeSpot(floe: Floe, wind: { x: number; z: number }, time: number, still = false) {
  if (still) return { x: floe.x, z: floe.z, yaw: floe.phase };
  const speed = Math.hypot(wind.x, wind.z);
  const lean = Math.min(0.5, speed * 4) * WANDER;
  const head = speed < 1e-4 ? { x: 0, z: 0 } : { x: wind.x / speed, z: wind.z / speed };
  const t = time * 0.05 + floe.phase;
  const roam = WANDER - lean;
  return {
    x: floe.x + Math.cos(t) * roam + head.x * lean,
    z: floe.z + Math.sin(t * 1.3) * roam + head.z * lean,
    yaw: floe.phase + time * floe.spin,
  };
}
