import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A skein of geese crossing high over the far shore in fall, in a V. The
 * dock sees little sky, so their mirror image crossing the lake carries most
 * of it. One comes over soon after you arrive, then with the geese's honking.
 */
export function geeseOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): boolean {
  return season === "fall" && hour !== "night" && sky !== "rain";
}

/** Birds in the V; Lite effects keep the leader and the first few. */
export const SKEIN_SIZE = 9;
/** Seconds to cross from one side to the other. */
export const CROSS_SEC = 24;
/** Seconds after one skein has gone before another may come over. */
export const SKEIN_REST = 40;
/** Seconds after arriving that the first skein comes over, honking or not. */
export const FIRST_SKEIN_SEC = 12;
/** The line they fly, inside the sky dome: high over the far shore, from one side to the other. */
export const SKEIN_Y = 13;
export const SKEIN_Z = -52;
export const SKEIN_SPAN_X = 56;
/** Meters each rank sits back, and out to either side, of the one ahead. */
const RANK_BACK = 2.2;
const RANK_SIDE = 1.9;
/** Wingbeats a second; geese row slow and steady. */
const FLAP_HZ = 2.6;

export type SkeinBird = { x: number; y: number; z: number; flap: number };

/** Whether a new skein may start at `now`, given when the last one did. */
export function skeinReady(now: number, lastStart: number) {
  return now - lastStart >= CROSS_SEC + SKEIN_REST;
}

/** Goose `k` (0 the leader) at `age` seconds into a crossing heading `dir` (+1 east, -1 west); null before or after it. */
export function skeinBird(k: number, age: number, dir: 1 | -1): SkeinBird | null {
  const u = age / CROSS_SEC;
  if (u < 0 || u > 1) return null;
  const rank = Math.ceil(k / 2);
  const side = k === 0 ? 0 : k % 2 === 1 ? -1 : 1;
  const lead = -SKEIN_SPAN_X + 2 * SKEIN_SPAN_X * u;
  // A slight sag and a little ragged, the way a real V never quite holds its shape.
  const ragged = Math.sin(age * 0.7 + k * 1.9) * 0.35;
  return {
    x: dir * (lead - rank * RANK_BACK),
    y: SKEIN_Y - rank * 0.25 + ragged * 0.4,
    z: SKEIN_Z + side * rank * RANK_SIDE + ragged,
    flap: Math.sin((age + k * 0.37) * FLAP_HZ * Math.PI * 2),
  };
}
