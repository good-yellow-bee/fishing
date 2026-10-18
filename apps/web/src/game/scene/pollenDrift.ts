import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, lakeEdge, type LakeSeason, type Sky as WeatherSky } from "@stillwater/shared";

/** Streaks of pollen out on the open water. */
export const POLLEN_STREAKS = 16;
/** Puffs of pollen along the shore, where the breeze piles it up. */
export const POLLEN_RIM = 56;
/** Which way the pollen lines up on a calm day, as a unit vector. */
const CALM_DRIFT = { x: 0.94, z: 0.34 };

/**
 * How thick the pollen lies on the water: a spring film of pine and birch pollen, gone by summer.
 * A downpour beats it under, so rain keeps it thin.
 */
export function pollenAmount(season: LakeSeason, sky: WeatherSky) {
  if (season !== "spring") return 0;
  return sky === "rain" ? 0.4 : 1;
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** The breeze's heading, or the calm day's slow drift, as a unit vector. */
export function pollenHeading(wind: { x: number; z: number }) {
  const speed = Math.hypot(wind.x, wind.z);
  return speed < 1e-3 ? CALM_DRIFT : { x: wind.x / speed, z: wind.z / speed };
}

export type PollenStreak = { points: { x: number; z: number }[]; width: number; alpha: number };

/**
 * Long wavering streaks of pollen out on the lake, lined up with the breeze the way windrows form,
 * more of them toward the downwind side. Every point is on the water.
 */
export function pollenStreaks(wind: { x: number; z: number }, count = POLLEN_STREAKS): PollenStreak[] {
  const head = pollenHeading(wind);
  const side = { x: -head.z, z: head.x };
  const streaks: PollenStreak[] = [];
  for (let i = 0, tries = 0; streaks.length < count && tries < count * 40; tries += 1, i += 1) {
    const x = (seeded(i, 1) * 2 - 1) * LAKE_RX * 0.85;
    const z = LAKE_CENTER_Z + (seeded(i, 2) * 2 - 1) * LAKE_RZ * 0.85;
    if (!inLake(x, z)) continue;
    // Downwind water keeps more of what the breeze pushes there.
    const downwind = ((x / LAKE_RX) * head.x + ((z - LAKE_CENTER_Z) / LAKE_RZ) * head.z + 1) / 2;
    if (seeded(i, 3) > 0.3 + 0.7 * downwind) continue;
    const length = 4 + seeded(i, 4) * 6;
    const wobble = 0.3 + seeded(i, 5) * 0.6;
    const phase = seeded(i, 6) * Math.PI * 2;
    const points: { x: number; z: number }[] = [];
    for (let step = 0; step <= 8; step += 1) {
      const along = (step / 8 - 0.5) * length;
      const sway = Math.sin(step * 0.8 + phase) * wobble;
      const px = x + head.x * along + side.x * sway;
      const pz = z + head.z * along + side.z * sway;
      if (!inLake(px, pz)) break;
      points.push({ x: px, z: pz });
    }
    if (points.length < 3) continue;
    streaks.push({ points, width: 0.25 + seeded(i, 7) * 0.35, alpha: 0.35 + seeded(i, 8) * 0.4 });
  }
  return streaks;
}

export type PollenPuff = { x: number; z: number; radius: number; alpha: number };

/**
 * Pollen piled against the shore: thick on the downwind bank, a thin rim elsewhere, all just
 * inside the water's edge.
 */
export function pollenRim(wind: { x: number; z: number }, count = POLLEN_RIM): PollenPuff[] {
  const head = pollenHeading(wind);
  const calm = Math.hypot(wind.x, wind.z) < 1e-3;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (seeded(i, 9) - 0.5) * 0.08;
    const edge = lakeEdge(angle) * (0.9 - seeded(i, 10) * 0.04);
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    // How squarely this stretch of bank faces downwind.
    const facing = (nx * head.x + nz * head.z + 1) / 2;
    const pile = calm ? 0.45 : 0.12 + 0.88 * facing * facing;
    return {
      x: nx * edge * LAKE_RX,
      z: LAKE_CENTER_Z + nz * edge * LAKE_RZ,
      radius: 0.5 + pile * 1.1,
      alpha: 0.18 + 0.6 * pile,
    };
  });
}
