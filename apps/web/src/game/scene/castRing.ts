import { BACKLASH_POWER, SLAP_POWER } from "../logic";

/**
 * The cast meter drawn on the water: while the angler holds, a ring grows
 * around the aim point and turns moss inside the sweet band, rust past the
 * backlash. Eyes never leave the lake.
 */

export type CastRingTone = "weak" | "short" | "band" | "long" | "over";

export const CAST_RING_COLORS: Record<CastRingTone, string> = {
  weak: "#c9a48a",
  short: "#e7f2ea",
  band: "#7fb069",
  long: "#e7f2ea",
  over: "#c4532f",
};

export function castRingRadius(power: number) {
  return 0.4 + Math.min(1, Math.max(0, power)) * 0.9;
}

export function castRing(power: number, band: { min: number; max: number }) {
  const tone: CastRingTone =
    power > BACKLASH_POWER
      ? "over"
      : power < SLAP_POWER
        ? "weak"
        : power < band.min
          ? "short"
          : power <= band.max
            ? "band"
            : "long";
  return {
    radius: castRingRadius(power),
    tone,
    inBand: tone === "band",
    // Fades in over the first stretch of the hold, so a tap to aim shows nothing.
    opacity: power <= 0 ? 0 : Math.min(0.85, 0.25 + power * 1.2),
  };
}
