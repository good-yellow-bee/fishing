import { inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/** A rainbow needs rain and a low sun, so it stands only at dawn and dusk, never in winter's sleet or a thunderstorm. */
export function rainbowOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, storm: boolean): boolean {
  return sky === "rain" && (hour === "dawn" || hour === "dusk") && season !== "winter" && !storm;
}

/** The bands from the outer edge in, red to violet. */
export const RAINBOW_BANDS = ["#ff5a4e", "#ff9a3c", "#ffe066", "#7fd36a", "#5aa8ff", "#8a6cff"] as const;

/** Meters from the arc's middle to its outer edge, and the width of each band. */
export const RAINBOW_RADIUS = 28;
export const RAINBOW_BAND = 1.1;
/** Steps round the half circle. */
export const RAINBOW_SEGMENTS = 64;

/** Seconds the arc takes to brighten from nothing, so it seems to come out of the rain. */
export const RAINBOW_FADE_IN = 8;

/** Peak opacity: a soft wash over the sky, never a painted stripe. The lake's copy is fainter still. */
export const RAINBOW_PEAK = 0.4;
export const RAINBOW_REFLECTION = 0.4;

/**
 * Where the arc's middle sits. The sky dome shows the sun ahead of the dock, so the arc stands across the sky
 * from it (left at dawn, right at dusk), its foot sunk behind the far hills.
 */
export function rainbowCenter(hour: LakeHour): [number, number, number] {
  const side = hour === "dusk" ? 1 : -1;
  return [side * 24, -6, -68];
}

/** How bright the arc is `seconds` after it first showed. */
export function rainbowOpacity(seconds: number): number {
  const t = Math.min(1, Math.max(0, seconds / RAINBOW_FADE_IN));
  return RAINBOW_PEAK * t * t * (3 - 2 * t);
}

export type ArcRow = { radius: number; color: string; alpha: number };

/** The ribbon's rows from the outer edge in: a clear edge, one row through each band's middle, and a clear inner edge, so the colours blend and the rims are soft. */
export function arcRows(): ArcRow[] {
  const last = RAINBOW_BANDS.length - 1;
  return [
    { radius: RAINBOW_RADIUS, color: RAINBOW_BANDS[0], alpha: 0 },
    ...RAINBOW_BANDS.map((color, i) => ({ radius: RAINBOW_RADIUS - (i + 0.5) * RAINBOW_BAND, color, alpha: 1 })),
    { radius: RAINBOW_RADIUS - (last + 1) * RAINBOW_BAND, color: RAINBOW_BANDS[last], alpha: 0 },
  ];
}

/** A point on the arc, `angle` round from its right foot, `radius` out from its middle. */
export function arcPoint(center: readonly [number, number, number], angle: number, radius: number): [number, number, number] {
  return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius, center[2]];
}

/** The lowest a point counts as sitting above the horizon, in meters, so a sunk foot still lands somewhere far off. */
const HORIZON_FLOOR = 0.5;

/**
 * Where a far sky point shows in the still lake for an eye at `eye`, the same sight-line mirror the stars use:
 * (x, -y, z) followed down to the water. `wet` is false where that lands off the water or the point sits below
 * the horizon, so the ribbon can fade out there rather than tear. Null with the eye not above the water.
 */
export function arcReflection(point: readonly [number, number, number], eye: { x: number; y: number; z: number }): { x: number; z: number; wet: boolean } | null {
  if (eye.y <= 0) return null;
  const t = eye.y / Math.max(point[1], HORIZON_FLOOR);
  const x = eye.x + point[0] * t;
  const z = eye.z + point[2] * t;
  return { x, z, wet: point[1] > 0 && inLake(x, z) };
}
