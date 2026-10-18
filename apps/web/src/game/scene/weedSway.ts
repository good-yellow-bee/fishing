import { inLake, type LakeSeason } from "@stillwater/shared";
import { waterDepth } from "./water";

/** Clumps of pondweed rooted in the clear shallows round the dock. */
export const WEED_CLUMPS: readonly { x: number; z: number }[] = [
  { x: -2.1, z: 4.5 },
  { x: -0.9, z: 3.7 },
  { x: 3.5, z: 5.3 },
];
export const STRANDS_PER_CLUMP = 14;
/** How far a clump's strands spread from its middle, in metres. */
const CLUMP_SPREAD = 0.45;
/** The tallest strand, in metres, in high summer; it never reaches the surface. */
export const WEED_TALL = 0.55;
/** Radians the swell sways a strand each way at its widest. */
export const WEED_SWAY = 0.22;

/** How the weed grows through the year: shoots in spring, full in summer, dying back in fall, gone in winter. */
export function weedGrowth(season: LakeSeason): { height: number; color: string } | null {
  if (season === "winter") return null;
  if (season === "spring") return { height: 0.55, color: "#7aa64a" };
  if (season === "fall") return { height: 0.85, color: "#7d7038" };
  return { height: 1, color: "#4e7d3c" };
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Strand = { x: number; z: number; height: number; phase: number; turn: number };

/** Every strand: rooted round its clump's middle, taller toward the middle, each on its own beat. */
export function weedStrands(): Strand[] {
  const strands: Strand[] = [];
  WEED_CLUMPS.forEach((clump, c) => {
    for (let i = 0; i < STRANDS_PER_CLUMP; i += 1) {
      const n = c * 100 + i;
      const angle = seeded(n, 1) * Math.PI * 2;
      const reach = Math.sqrt(seeded(n, 2)) * CLUMP_SPREAD;
      const x = clump.x + Math.cos(angle) * reach;
      const z = clump.z + Math.sin(angle) * reach;
      if (!inLake(x, z) || waterDepth(x, z) <= 0) continue;
      strands.push({
        x,
        z,
        height: WEED_TALL * (0.55 + 0.45 * (1 - reach / CLUMP_SPREAD)) * (0.85 + seeded(n, 3) * 0.15),
        phase: seeded(n, 4) * Math.PI * 2,
        turn: seeded(n, 5) * Math.PI,
      });
    }
  });
  return strands;
}

/**
 * How far a strand leans `time` seconds in, as turns about world x and z for a stem standing on
 * its root: the swell rocks the clump to and fro along one line, each strand a little out of step.
 * Reduced motion stands it upright.
 */
export function strandSway(strand: Strand, time: number, still = false) {
  if (still) return { x: 0, z: 0 };
  const rock = Math.sin(time * 0.9 + strand.phase * 0.35) * WEED_SWAY;
  const flutter = Math.sin(time * 2.3 + strand.phase) * WEED_SWAY * 0.25;
  // The swell runs across the lake toward the dock, so the weed rocks mostly along z.
  return { x: rock + flutter, z: flutter * 0.6 };
}
