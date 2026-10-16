import type { Logbook } from "@stillwater/shared";
import { t } from "../i18n";

export type HookTally = { outings: number; landed: number; lost: number; missed: number };

/**
 * Lost fish and missed strikes summed over the outings where the angler counted them (on one water when `spotId` is set),
 * with the fish landed on those same outings, so "landed of hooked" compares like with like. Null when no outing was counted.
 */
export function hookTally(book: Logbook, spotId?: string): HookTally | null {
  const counted = book.trips.filter((trip) => (trip.lost || trip.missed) && (spotId === undefined || trip.spotId === spotId));
  if (counted.length === 0) return null;
  const ids = new Set(counted.map((trip) => trip.id));
  return {
    outings: counted.length,
    landed: book.catches.filter((entry) => entry.tripId && ids.has(entry.tripId)).length,
    lost: counted.reduce((sum, trip) => sum + (trip.lost ?? 0), 0),
    missed: counted.reduce((sum, trip) => sum + (trip.missed ?? 0), 0),
  };
}

/** "On outings you counted (3): landed 9 of 12 hooked, missed strikes: 5." */
export function hookText(tally: HookTally): string {
  return t("On outings you counted ({outings}): landed {landed} of {hooked} hooked, missed strikes: {missed}.", {
    outings: tally.outings,
    landed: tally.landed,
    hooked: tally.landed + tally.lost,
    missed: tally.missed,
  });
}
