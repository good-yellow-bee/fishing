import type { CatchEntry } from "@stillwater/shared";

/** The address parameter for a new catch form's starting time (YYYY-MM-DDTHH:MM, local). */
export const AT_PARAM = "at";
/** "?resume=1": open the catch form on the unsaved fish, as Home's "Pick it up" promises. */
export const RESUME_PARAM = "resume";

/**
 * A new catch form that starts from this fish: same water, outing, species, lure and measure, but the time is now.
 * With `at` (a fish logged for an earlier day), the form starts at that fish's time instead, so an outing written up
 * afterwards goes fish by fish without retyping the day and hour.
 */
export function anotherCatchLink(
  entry: Pick<CatchEntry, "spotId" | "species" | "lure" | "tripId"> & { measure: Pick<CatchEntry["measure"], "kind"> },
  at?: string,
): string {
  const params = new URLSearchParams({ spot: entry.spotId, species: entry.species, lure: entry.lure, kind: entry.measure.kind });
  if (entry.tripId) params.set("trip", entry.tripId);
  if (at) params.set(AT_PARAM, at);
  return `/catches/new?${params.toString()}`;
}
