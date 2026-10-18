import type { LakeHour, LakeSeason, Sky as WeatherSky } from "@stillwater/shared";

export type Bloom = "bud" | "flower" | null;

/** Water lilies flower through the summer; late spring shows only buds, and fall and winter have none. */
export function lilyBloom(season: LakeSeason): Bloom {
  if (season === "summer") return "flower";
  if (season === "spring") return "bud";
  return null;
}

/**
 * The pads themselves: young and small in spring, full grown in summer, yellowing in fall (they
 * take the season's colour as the bank's grass does), and died back under the ice in winter.
 */
export function lilyPads(season: LakeSeason): { grow: number } | null {
  if (season === "winter") return null;
  return { grow: season === "spring" ? 0.75 : 1 };
}

/** White and pink lilies, alternating along the beds. */
export const LILY_PETALS = ["#f7f3ea", "#f2b8c8"] as const;
export const LILY_HEART = "#f2c94c";
export const PETAL_COUNT = 8;

/** Each petal's turn round the flower, in radians. */
export function petalAngles(): number[] {
  return Array.from({ length: PETAL_COUNT }, (_, i) => (i / PETAL_COUNT) * Math.PI * 2);
}

/** How far the lilies open through the day: wide by day, half open at dawn, closing at dusk, shut at night. */
const HOUR_OPEN: Record<LakeHour, number> = { dawn: 0.5, day: 1, dusk: 0.3, night: 0 };
/** Dull weather keeps them partly closed, and a downpour nearly shut. */
const SKY_OPEN: Record<WeatherSky, number> = { clear: 1, "partly-cloudy": 0.95, overcast: 0.75, fog: 0.65, rain: 0.35 };

/** How open the lily flowers are, from 0 (shut) to 1 (wide open). */
export function lilyOpen(hour: LakeHour, sky: WeatherSky) {
  return HOUR_OPEN[hour] * SKY_OPEN[sky];
}

/**
 * The flower's shape for an openness: an open flower lies flat; a shut one draws its petals in and
 * up into a tall pointed cup.
 */
export function lilyCup(open: number) {
  const shut = 1 - Math.min(1, Math.max(0, open));
  return { spread: 1 - 0.55 * shut, rise: 1 + 1.3 * shut };
}

/** Eases a flower toward its openness, a little each frame, so it opens and closes slowly. */
export function easeLily(current: number, target: number, delta: number) {
  return current + (target - current) * Math.min(1, delta * 0.4);
}
