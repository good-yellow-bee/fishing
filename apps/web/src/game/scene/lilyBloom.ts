import type { LakeSeason } from "@stillwater/shared";

export type Bloom = "bud" | "flower" | null;

/** Water lilies flower through the summer; late spring shows only buds, and fall and winter have none. */
export function lilyBloom(season: LakeSeason): Bloom {
  if (season === "summer") return "flower";
  if (season === "spring") return "bud";
  return null;
}

/** White and pink lilies, alternating along the beds. */
export const LILY_PETALS = ["#f7f3ea", "#f2b8c8"] as const;
export const LILY_HEART = "#f2c94c";
export const PETAL_COUNT = 8;

/** Each petal's turn round the flower, in radians. */
export function petalAngles(): number[] {
  return Array.from({ length: PETAL_COUNT }, (_, i) => (i / PETAL_COUNT) * Math.PI * 2);
}
