import type { LakeSeason } from "@stillwater/shared";

/** Ducklings behind the mother in spring, and how far back along her loop each paddles (share of the loop). */
export const DUCKLING_COUNT = 4;
export const DUCKLING_GAP = 0.026;

/** Seconds between peeps: at least the first, plus up to the second. */
export const DUCKLING_PEEP_MIN = 3;
export const DUCKLING_PEEP_SPREAD = 5;

/** Spring broods only. */
export function ducklingsOut(season: LakeSeason) {
  return season === "spring";
}

/** Where duckling `k` sits on the loop when the mother is at `t` (0..1, wrapping), with a little side-to-side weave. */
export function ducklingAt(t: number, k: number, time: number) {
  const along = (((t - DUCKLING_GAP * (k + 1)) % 1) + 1) % 1;
  return { along, weave: Math.sin(time * 2.2 + k * 1.9) * 0.08 };
}
