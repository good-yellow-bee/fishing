import { SPOT_IDS, type LakeSeason, type SpotId } from "@stillwater/shared";
import { readAngler, writeAngler } from "./anglerStore";
import { GROUNDBAIT_CASTS, type Groundbait } from "./logic";

/** Kept per angler: the swim they last groundbaited, so a handful thrown before leaving still works on the next visit. */
export function swimKey(userId: string) {
  return `stillwater.swim.${userId}.v1`;
}
/** Left this long, the feeders gather over it and the swim fishes as freshly baited again. */
export const SWIM_PRIMED_MS = 6 * 3_600_000;
/** Left longer than this, the groundbait is eaten and gone. */
export const SWIM_GONE_MS = 48 * 3_600_000;
/** Summer's hungry fish find a swim left behind sooner, and eat it within a day. */
export const SWIM_HOT_PRIMED_MS = 3 * 3_600_000;
export const SWIM_HOT_GONE_MS = 24 * 3_600_000;
/** Winter's slow fish take longer to gather over it, but it keeps four days in the cold. */
export const SWIM_COLD_PRIMED_MS = 12 * 3_600_000;
export const SWIM_COLD_GONE_MS = 96 * 3_600_000;
/** Bread crumb in the groundbait holds the feeders gathered over a swim left behind for this many casts. */
export const BREAD_SWIM_CASTS = GROUNDBAIT_CASTS + 3;

/** When a swim left behind primes and when it is gone, judged by the lake's season when the angler comes back. */
export function swimTimes(season: LakeSeason | undefined): { primedMs: number; goneMs: number } {
  if (season === "summer") return { primedMs: SWIM_HOT_PRIMED_MS, goneMs: SWIM_HOT_GONE_MS };
  if (season === "winter") return { primedMs: SWIM_COLD_PRIMED_MS, goneMs: SWIM_COLD_GONE_MS };
  return { primedMs: SWIM_PRIMED_MS, goneMs: SWIM_GONE_MS };
}

/** A groundbaited swim, when the handful went in, whether the feeders have already gathered over it once, and whether bread crumb went in with it. */
export type Swim = Groundbait & { at: number; primed?: boolean; bread?: boolean };

export function loadSwim(userId: string): Swim | null {
  return readAngler(swimKey(userId), (raw) => {
    const swim = raw as Partial<Swim> | null;
    return swim &&
      (SPOT_IDS as readonly unknown[]).includes(swim.spot) &&
      Number.isInteger(swim.casts) &&
      swim.casts! >= 1 &&
      swim.casts! <= (swim.bread ? BREAD_SWIM_CASTS : GROUNDBAIT_CASTS) &&
      typeof swim.at === "number"
      ? { spot: swim.spot!, casts: swim.casts!, at: swim.at, ...(swim.primed ? { primed: true } : {}), ...(swim.bread ? { bread: true } : {}) }
      : null;
  });
}

export function saveSwim(userId: string, swim: Swim | null) {
  writeAngler(swimKey(userId), swim);
}

/** The swim on a new visit: as it was if soon after, freshly baited once when the feeders have gathered (longer with bread crumb in it), gone once the season's days run out. */
export function swimNow(swim: Swim | null, now: number, season?: LakeSeason): (Swim & { primedNow: boolean }) | null {
  if (!swim || swim.casts <= 0) return null;
  const age = now - swim.at;
  const { primedMs, goneMs } = swimTimes(season);
  if (age > goneMs) return null;
  return age >= primedMs && !swim.primed ? { spot: swim.spot as SpotId, casts: swim.bread ? BREAD_SWIM_CASTS : GROUNDBAIT_CASTS, at: swim.at, primed: true, ...(swim.bread ? { bread: true } : {}), primedNow: true } : { ...swim, primedNow: false };
}
