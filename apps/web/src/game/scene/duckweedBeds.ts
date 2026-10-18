import { inLake, type LakeSeason } from "@stillwater/shared";
import { pollenHeading } from "./pollenDrift";

export type DuckweedBed = { x: number; z: number; radius: number };

/**
 * The lake's still corners, where duckweed gathers: in the lee of the two reed clumps, among the
 * lily pads, and in two sheltered coves on the east and north-west banks.
 */
export const DUCKWEED_BEDS: DuckweedBed[] = [
  { x: -13.2, z: 1.8, radius: 2.4 },
  { x: 11.4, z: -9.7, radius: 1.9 },
  { x: -7.6, z: 5.2, radius: 1.6 },
  { x: 8.4, z: -8.0, radius: 1.4 },
  { x: -11.4, z: -5.4, radius: 1.8 },
  { x: 17.6, z: -5.0, radius: 1.5 },
  { x: -14.1, z: -10.3, radius: 1.5 },
];

/** Fronds painted per square meter of bed, at its densest. */
const SPECKS_PER_M2 = 60;
/** How far the day's breeze can push a bed off its corner, in meters. */
const MAX_PUSH = 0.8;

/**
 * How thick the duckweed lies: it spreads through the warm still water of summer, thins as fall
 * cools the lake, and is gone in winter and spring.
 */
export function duckweedAmount(season: LakeSeason) {
  if (season === "summer") return 1;
  return season === "fall" ? 0.45 : 0;
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type DuckweedSpeck = { x: number; z: number; size: number; alpha: number };

/**
 * Every frond of every bed: a ragged patch around each still corner, thick in the middle and
 * breaking up toward its rim, nudged a little downwind and drawn out along the breeze. Every frond
 * is on the water.
 */
export function duckweedSpecks(wind: { x: number; z: number }): DuckweedSpeck[] {
  const head = pollenHeading(wind);
  const side = { x: -head.z, z: head.x };
  const speed = Math.hypot(wind.x, wind.z);
  const push = Math.min(MAX_PUSH, speed * 8);
  const stretch = 1 + Math.min(0.5, speed * 4);
  const specks: DuckweedSpeck[] = [];
  DUCKWEED_BEDS.forEach((bed, b) => {
    const count = Math.round(Math.PI * bed.radius ** 2 * SPECKS_PER_M2);
    const phase = seeded(b, 11) * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      const n = b * 5000 + i;
      const angle = seeded(n, 1) * Math.PI * 2;
      // A ragged rim, so a bed never reads as a painted disc.
      const rim = bed.radius * (0.75 + 0.18 * Math.sin(3 * angle + phase) + 0.07 * Math.sin(7 * angle + phase * 2));
      const depth = Math.sqrt(seeded(n, 2));
      // Fronds thin out toward the rim.
      if (seeded(n, 3) < depth ** 4 * 0.7) continue;
      const along = Math.cos(angle) * depth * rim * stretch + push;
      const across = Math.sin(angle) * depth * rim;
      const x = bed.x + head.x * along + side.x * across;
      const z = bed.z + head.z * along + side.z * across;
      if (!inLake(x, z)) continue;
      specks.push({ x, z, size: 0.04 + seeded(n, 4) * 0.05, alpha: 0.95 - 0.45 * depth ** 2 });
    }
  });
  return specks;
}
