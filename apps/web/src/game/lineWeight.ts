import type { LakeHour, LakeSeason, Sky, Wind } from "@stillwater/shared";

/** The line on the reel: light line the fish can't see but that snaps sooner, heavy line that holds more but that they see, or standard line on a wire leader a pike's teeth can't fray. */
export type LineWeight = "light" | "standard" | "heavy" | "wire";
export const LINE_WEIGHTS: readonly LineWeight[] = ["light", "standard", "heavy", "wire"];
/** How long a bite takes on each line, and the strain it snaps at as a share of a standard line's. */
export const LINE_WAIT: Record<LineWeight, number> = { light: 0.85, standard: 1, heavy: 1.15, wire: 1.2 };
export const LINE_SNAP: Record<LineWeight, number> = { light: 0.9, standard: 1, heavy: 1.1, wire: 1 };
/** On a clear, calm day, or in winter's clear water, the fish see heavy line plainer, so its bites come slower still; outside winter a ripple, cloud or night hide it, and rain hides it altogether. */
export const HEAVY_BRIGHT_WAIT = 1.3;
/** Whether the water is bright and calm: a clear sky with no wind, from dawn to dusk. */
export function brightCalm(hour: LakeHour, sky: Sky | undefined, wind: Wind | undefined) {
  return sky === "clear" && wind === "calm" && hour !== "night";
}
/** In winter the cold water runs clear and the fish grow line-shy, so light line's bites come sooner still, and heavy line's come as slow as in bright, calm water. */
export const LIGHT_WINTER_WAIT = 0.75;
/** Whether the water is winter's clear water: from dawn to dusk in winter, as the night hides the line, and not in rain, which runs it murky. */
export function winterClear(hour: LakeHour, season: LakeSeason | undefined, sky: Sky | undefined) {
  return season === "winter" && hour !== "night" && !murkyRain(sky);
}
/** Whether the rain has run the water murky, so the fish can't see heavy line at all. */
export function murkyRain(sky: Sky | undefined) {
  return sky === "rain";
}
/** How long a bite takes on this line: heavy line shows plainer in bright, calm water or winter's clear water, where light line's bites come sooner, and murky rain water hides it, so its bites come at the standard pace. */
export function lineWaitMul(line: LineWeight, bright: boolean, winter: boolean, murky: boolean) {
  if (line === "heavy" && murky) return LINE_WAIT.standard;
  if (line === "heavy" && (bright || winter)) return HEAVY_BRIGHT_WAIT;
  if (line === "light" && winter) return LIGHT_WINTER_WAIT;
  return LINE_WAIT[line];
}
/** How long a fish holds in the weeds or a line stays wrapped round wood, as a share: heavy line pulls it out in half the time. */
export const LINE_COVER: Record<LineWeight, number> = { light: 1, standard: 1, heavy: 0.5, wire: 1 };
/** How often a pike or muskie bites through light line at the strike. */
export const LIGHT_BITE_THROUGH = 0.2;

/** The next line, round from light to heavy, on to the wire leader and back. */
export function nextLine(line: LineWeight): LineWeight {
  return LINE_WEIGHTS[(LINE_WEIGHTS.indexOf(line) + 1) % LINE_WEIGHTS.length];
}
