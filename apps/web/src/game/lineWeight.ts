/** The line on the reel: light line the fish can't see but that snaps sooner, heavy line that holds more but that they see, or standard line on a wire leader a pike's teeth can't fray. */
export type LineWeight = "light" | "standard" | "heavy" | "wire";
export const LINE_WEIGHTS: readonly LineWeight[] = ["light", "standard", "heavy", "wire"];
/** How long a bite takes on each line, and the strain it snaps at as a share of a standard line's. */
export const LINE_WAIT: Record<LineWeight, number> = { light: 0.85, standard: 1, heavy: 1.15, wire: 1.2 };
export const LINE_SNAP: Record<LineWeight, number> = { light: 0.9, standard: 1, heavy: 1.1, wire: 1 };
/** How long a fish holds in the weeds or a line stays wrapped round wood, as a share: heavy line pulls it out in half the time. */
export const LINE_COVER: Record<LineWeight, number> = { light: 1, standard: 1, heavy: 0.5, wire: 1 };
/** How often a pike or muskie bites through light line at the strike. */
export const LIGHT_BITE_THROUGH = 0.2;

/** The next line, round from light to heavy, on to the wire leader and back. */
export function nextLine(line: LineWeight): LineWeight {
  return LINE_WEIGHTS[(LINE_WEIGHTS.indexOf(line) + 1) % LINE_WEIGHTS.length];
}
