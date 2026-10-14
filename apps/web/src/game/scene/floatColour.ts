/**
 * The float model paints its body from one swatch of the shared colormap
 * palette (eight swatches across). Picking a colour slides those UVs across
 * to another swatch in the same row; the white cap stays white.
 */

export const FLOAT_COLOURS = ["blue", "red", "orange", "yellow", "green", "purple"] as const;
export type FloatColour = (typeof FLOAT_COLOURS)[number];

/** Which palette swatch, left to right, each colour sits in. */
const SWATCH: Record<FloatColour, number> = { blue: 5, red: 4, orange: 3, yellow: 2, green: 1, purple: 7 };
const SWATCHES = 8;
/** The model's own body swatch. */
const BODY_SWATCH = SWATCH.blue;

/** A swatch for each colour, for the Settings buttons. */
export const FLOAT_SWATCH_HEX: Record<FloatColour, string> = {
  blue: "#638ad3",
  red: "#f56843",
  orange: "#ff9344",
  yellow: "#ffc658",
  green: "#51bb83",
  purple: "#976ade",
};

/** The u coordinate moved from the body swatch to `colour`'s; anything outside the body swatch is left alone. */
export function floatU(u: number, colour: FloatColour): number {
  const swatch = Math.floor(u * SWATCHES);
  if (swatch !== BODY_SWATCH) return u;
  return u + (SWATCH[colour] - BODY_SWATCH) / SWATCHES;
}

/** Repaint a float's UVs, a flat [u, v, u, v, ...] array, in place. */
export function recolourFloatUvs(uv: { length: number; [index: number]: number }, colour: FloatColour) {
  for (let i = 0; i < uv.length; i += 2) uv[i] = floatU(uv[i]!, colour);
}
