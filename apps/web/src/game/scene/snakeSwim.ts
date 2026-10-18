import type { LakeHour, LakeSeason, Sky as WeatherSky } from "@stillwater/shared";

/** The grass snake's swim from the lily pads out into the lake in front of the dock; it swims it one way, then back. */
export const SNAKE_ROUTE = { from: { x: -6.6, z: 4.4 }, to: { x: -1.0, z: 0.6 } } as const;
/** One swim, then a while out of sight under the water, in seconds. */
export const SNAKE_CYCLE = 90;
export const SNAKE_SWIM = 30;
/** The body's beads, head first, and the spacing between them in metres. */
export const SNAKE_BEADS = 16;
export const BEAD_GAP = 0.065;
/** How far the body's S-wave swings to each side at its widest, in metres. */
const WAVE = 0.07;

/** A grass snake swims across on warm, bright days from late spring to the end of summer. */
export function snakeOut(season: LakeSeason, hour: LakeHour, sky: WeatherSky) {
  return (season === "summer" || season === "spring") && hour === "day" && sky !== "rain";
}

export type SnakeBead = { x: number; z: number; lift: number; size: number };

/**
 * The snake's body `time` seconds in, head first, or null while it is out of sight.
 * The head rides a little high and leads; behind it an S-wave runs down the body, which tapers
 * to the tail. Reduced motion freezes the wave but still lets it cross.
 */
export function snakeBody(time: number, still = false): SnakeBead[] | null {
  const lap = ((time % SNAKE_CYCLE) + SNAKE_CYCLE) % SNAKE_CYCLE;
  if (lap >= SNAKE_SWIM) return null;
  // Every other lap it swims back the other way.
  const back = Math.floor(time / SNAKE_CYCLE) % 2 === 1;
  const from = back ? SNAKE_ROUTE.to : SNAKE_ROUTE.from;
  const to = back ? SNAKE_ROUTE.from : SNAKE_ROUTE.to;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const ahead = { x: dx / length, z: dz / length };
  const side = { x: -ahead.z, z: ahead.x };
  const run = (lap / SNAKE_SWIM) * length;
  const wave = still ? 0 : time * 6;
  return Array.from({ length: SNAKE_BEADS }, (_, i) => {
    const s = Math.max(0, run - i * BEAD_GAP);
    const taper = i / (SNAKE_BEADS - 1);
    // The wave grows from nothing at the head to its widest down the body.
    const swing = Math.sin(i * 0.7 - wave) * WAVE * Math.min(1, i / 4);
    return {
      x: from.x + ahead.x * s + side.x * swing,
      z: from.z + ahead.z * s + side.z * swing,
      lift: i === 0 ? 0.04 : 0.008,
      size: i === 0 ? 0.034 : 0.026 * (1 - taper * 0.75),
    };
  });
}
