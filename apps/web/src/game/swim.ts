import type { SpotId } from "@stillwater/shared";
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

/** A groundbaited swim and when the handful went in. */
export type Swim = Groundbait & { at: number };

export function loadSwim(userId: string): Swim | null {
  return readAngler(swimKey(userId), (raw) => {
    const swim = raw as Partial<Swim> | null;
    return swim && typeof swim.spot === "string" && typeof swim.casts === "number" && typeof swim.at === "number" ? { spot: swim.spot, casts: swim.casts, at: swim.at } : null;
  });
}

export function saveSwim(userId: string, swim: Swim | null) {
  writeAngler(swimKey(userId), swim);
}

/** The swim on a new visit: as it was if soon after, freshly primed once the feeders have gathered overnight, gone after two days. */
export function swimNow(swim: Swim | null, now: number): (Groundbait & { primed: boolean }) | null {
  if (!swim || swim.casts <= 0) return null;
  const age = now - swim.at;
  if (age > SWIM_GONE_MS) return null;
  return age >= SWIM_PRIMED_MS ? { spot: swim.spot as SpotId, casts: GROUNDBAIT_CASTS, primed: true } : { spot: swim.spot as SpotId, casts: swim.casts, primed: false };
}
