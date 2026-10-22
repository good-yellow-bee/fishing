import type { LakeHour } from "@stillwater/shared";

/** The line on the reel: light line the fish can't see but that snaps sooner, heavy line that holds more but that they see, or standard line on a wire leader a pike's teeth can't fray. */
export type LineWeight = "light" | "standard" | "heavy" | "wire";
export const LINE_WEIGHTS: readonly LineWeight[] = ["light", "standard", "heavy", "wire"];
/** How long a bite takes on each line, and the strain it snaps at as a share of a standard line's. */
export const LINE_WAIT: Record<LineWeight, number> = { light: 0.85, standard: 1, heavy: 1.15, wire: 1.2 };
export const LINE_SNAP: Record<LineWeight, number> = { light: 0.9, standard: 1, heavy: 1.1, wire: 1 };
/** On a clear, calm day the fish see heavy line plainer, so its bites come slower still; a ripple, cloud, rain or night hide it. */
export const HEAVY_BRIGHT_WAIT = 1.3;
/** How long a bite takes on this line under this sky: heavy line shows plainer in bright, calm water from dawn to dusk. */
export function lineWaitMul(line: LineWeight, hour: LakeHour, sky: string | undefined, wind: string | undefined) {
  return line === "heavy" && sky === "clear" && wind === "calm" && hour !== "night" ? HEAVY_BRIGHT_WAIT : LINE_WAIT[line];
}
/** How long a fish holds in the weeds or a line stays wrapped round wood, as a share: heavy line pulls it out in half the time. */
export const LINE_COVER: Record<LineWeight, number> = { light: 1, standard: 1, heavy: 0.5, wire: 1 };
/** How often a pike or muskie bites through light line at the strike. */
export const LIGHT_BITE_THROUGH = 0.2;

/** The next line, round from light to heavy, on to the wire leader and back. */
export function nextLine(line: LineWeight): LineWeight {
  return LINE_WEIGHTS[(LINE_WEIGHTS.indexOf(line) + 1) % LINE_WEIGHTS.length];
}
