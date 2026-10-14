import type { LakeSeason, Sky, Wind } from "@stillwater/shared";

/**
 * Summer storms: on a rain day with a strong wind the sky flashes now and then and thunder rolls in after it.
 * Winter rain falls as snow, so it stays quiet.
 */
export function stormOn(sky: Sky, season: LakeSeason, wind: Wind): boolean {
  return sky === "rain" && wind === "strong" && season !== "winter";
}

/** Seconds between strikes, from a 0..1 roll. */
export const STRIKE_GAP = { min: 14, max: 40 } as const;

export function strikeGap(roll: number): number {
  return STRIKE_GAP.min + roll * (STRIKE_GAP.max - STRIKE_GAP.min);
}

/** How long the thunder takes to arrive: about three seconds a kilometre, so a near strike (1) cracks at once. */
export function thunderDelay(near: number): number {
  return 0.4 + (1 - near) * 5.6;
}

/** How long a flash lasts on screen, in milliseconds. */
export const FLASH_MS = 520;

/**
 * The flash's brightness, 0..1, this many milliseconds after the strike: a bright blink, a dip, a second
 * flicker as the return stroke runs, then a quick fade.
 */
export function flashLevel(ms: number): number {
  if (ms < 0 || ms >= FLASH_MS) return 0;
  if (ms < 70) return 1;
  if (ms < 130) return 0.25;
  if (ms < 210) return 0.8;
  return 0.8 * (1 - (ms - 210) / (FLASH_MS - 210));
}
