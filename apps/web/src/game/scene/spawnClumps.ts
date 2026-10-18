import { inLake, type LakeSeason } from "@stillwater/shared";

/** Where the frogs lay, in the still water by the lily pads, left of the dock. */
export const SPAWN_CLUMPS: readonly { x: number; z: number; r: number }[] = [
  { x: -5.4, z: 5.4, r: 0.26 },
  { x: -4.6, z: 6.3, r: 0.2 },
  { x: -6.2, z: 6.1, r: 0.22 },
];
export const EGGS_PER_CLUMP = 70;
/** Each egg's jelly, in metres across; drawn larger than life so a clump reads from the dock. */
export const EGG_SIZE = 0.028;

/** Frogspawn floats by the lily pads in spring, before the tadpoles hatch out of it. */
export function spawnOut(season: LakeSeason) {
  return season === "spring";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Egg = { x: number; z: number; lift: number; clump: number };

/** Every egg: packed in a mound in its clump, the middle riding a little higher than the edges. */
export function spawnEggs(): Egg[] {
  const eggs: Egg[] = [];
  SPAWN_CLUMPS.forEach((clump, c) => {
    for (let i = 0; i < EGGS_PER_CLUMP; i += 1) {
      const n = c * 1000 + i;
      // A sunflower spiral packs the eggs evenly without overlapping.
      const reach = Math.sqrt((i + 0.5) / EGGS_PER_CLUMP) * clump.r * (0.9 + seeded(n, 1) * 0.15);
      const angle = i * 2.39996 + c;
      const x = clump.x + Math.cos(angle) * reach;
      const z = clump.z + Math.sin(angle) * reach * 0.8;
      eggs.push({ x, z, lift: (1 - reach / clump.r) * 0.03 + seeded(n, 2) * 0.006, clump: c });
    }
  });
  return eggs;
}

/** Whether every clump floats on the water, none on the bank. */
export function clumpsAfloat() {
  return SPAWN_CLUMPS.every((c) => inLake(c.x, c.z));
}
