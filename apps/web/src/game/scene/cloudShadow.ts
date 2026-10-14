import type { LakeHour, Sky as WeatherSky } from "@stillwater/shared";

/** How dark a passing cloud's shadow lies on the water at its middle. */
export const CLOUD_SHADOW_DARK = 0.2;
/** Texture offset a second with no wind: clouds aloft still drift east. */
export const CLOUD_DRIFT = 0.006;
/** Texture offset a second for each meter per second of the day's wind at the water. */
export const CLOUD_WIND = 0.12;

/** Cloud shadows only read on a fair day under a high sun or low one: not at night and not under a lid of grey. */
export function cloudShadowStrength(hour: LakeHour, sky: WeatherSky) {
  if (sky !== "clear" || hour === "night") return 0;
  return hour === "day" ? CLOUD_SHADOW_DARK : CLOUD_SHADOW_DARK * 0.6;
}

/** Texture offset a second for the shadow layer, downwind in the same terms as the surface streaks (u with x, v against z). */
export function cloudScroll(wind: { x: number; z: number }) {
  return { x: -CLOUD_DRIFT - wind.x * CLOUD_WIND, y: wind.z * CLOUD_WIND };
}

export type CloudBlob = { x: number; y: number; r: number; squash: number };

function unit(index: number, salt: number) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** A few broad, flattened blobs per tile, 0..1 across it; drawn wrapped so the tile repeats without a seam. */
export function cloudBlobs(count = 7): CloudBlob[] {
  return Array.from({ length: count }, (_, i) => ({ x: unit(i, 1), y: unit(i, 2), r: 0.1 + unit(i, 3) * 0.12, squash: 0.55 + unit(i, 4) * 0.3 }));
}
