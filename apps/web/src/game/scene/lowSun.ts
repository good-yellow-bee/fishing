import type { LakeHour, Sky } from "@stillwater/shared";

/**
 * At dawn and dusk under an open sky the low sun lays long shadows across the lake: the angler's own reaches out
 * over the water, which puts the fish off at the bank with the sun behind it (logic.ts longShadowWaitMul). Level
 * water catches almost no light from a sun that low, so its shadows are drawn on the water by a shadow-only layer.
 */
export function lowSunShadows(hour: LakeHour, sky: Sky | undefined) {
  return (hour === "dawn" || hour === "dusk") && (sky === "clear" || sky === "partly-cloudy");
}

/** How dark those shadows lie on the water; a touch lighter at dusk, when the water is darker already. */
export function lowSunShadow(hour: LakeHour) {
  return hour === "dusk" ? 0.45 : 0.55;
}
