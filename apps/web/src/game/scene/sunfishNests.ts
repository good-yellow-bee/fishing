import { inLake, type LakeSeason } from "@stillwater/shared";
import { waterDepth } from "./water";

/** The sandy shallows either side of the dock where the sunfish fan their nests. */
export const NEST_COLONIES: readonly { x: number; z: number }[] = [
  { x: 3.0, z: 7.4 },
  { x: -2.8, z: 7.7 },
];
export const NESTS_PER_COLONY = 6;
/** How far a colony's nests spread from its middle, in metres. */
const COLONY_SPREAD = 1.1;
/** Nests are fanned only on the sandy shelf, never out over the drop. */
const MAX_DEPTH = 0.3;

/** Sunfish nest from late spring through the summer; the beds are gone by fall. */
export function nestsOut(season: LakeSeason) {
  return season === "spring" || season === "summer";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Nest = { x: number; z: number; radius: number; phase: number };

/**
 * Every nest: pale round beds fanned in the sand, packed close in each colony but never
 * overlapping, all on the shallow shelf.
 */
export function sunfishNests(): Nest[] {
  const nests: Nest[] = [];
  NEST_COLONIES.forEach((colony, c) => {
    let placed = 0;
    for (let i = 0; placed < NESTS_PER_COLONY && i < 400; i += 1) {
      const n = c * 1000 + i;
      const angle = seeded(n, 1) * Math.PI * 2;
      const reach = Math.sqrt(seeded(n, 2)) * COLONY_SPREAD;
      const x = colony.x + Math.cos(angle) * reach;
      const z = colony.z + Math.sin(angle) * reach;
      const radius = 0.22 + seeded(n, 3) * 0.12;
      if (!inLake(x, z) || waterDepth(x, z) > MAX_DEPTH) continue;
      if (nests.some((nest) => Math.hypot(nest.x - x, nest.z - z) < nest.radius + radius + 0.05)) continue;
      nests.push({ x, z, radius, phase: seeded(n, 4) * Math.PI * 2 });
      placed += 1;
    }
  });
  return nests;
}

/**
 * The cock sunfish guarding a nest, `time` seconds in: it hovers over the bed, drifting about
 * its middle and turning to face its way. Reduced motion holds it over the middle.
 */
export function guardSpot(nest: Nest, time: number, still = false) {
  if (still) return { x: nest.x, z: nest.z, yaw: nest.phase };
  const t = time * 0.6 + nest.phase;
  const reach = nest.radius * 0.45;
  const x = nest.x + Math.cos(t) * reach * Math.sin(t * 0.37);
  const z = nest.z + Math.sin(t * 1.3) * reach * 0.8;
  // Facing along its drift.
  const dx = -Math.sin(t) * Math.sin(t * 0.37) + Math.cos(t) * 0.37 * Math.cos(t * 0.37);
  const dz = 1.3 * Math.cos(t * 1.3) * 0.8;
  return { x, z, yaw: Math.atan2(dx, dz) };
}
