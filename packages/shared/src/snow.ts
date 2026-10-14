import type { LakeSeason } from "./season.ts";
import { SKY_BLURB, SKY_LABELS, type Sky } from "./weather.ts";

/** A rainy winter day snows. The fish read it as rain; only the look, the sound and the words change. */
export function isSnow(sky: Sky, season: LakeSeason | null | undefined) {
  return sky === "rain" && season === "winter";
}

/** The sky's name for the season: "Snow" for winter rain. */
export function skyLabel(sky: Sky, season: LakeSeason | null | undefined): string {
  return isSnow(sky, season) ? "Snow" : SKY_LABELS[sky];
}

export function skyBlurb(sky: Sky, season: LakeSeason | null | undefined): string {
  return isSnow(sky, season) ? "Snow on the water. Pike and muskie hunt." : SKY_BLURB[sky];
}
