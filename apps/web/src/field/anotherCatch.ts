import type { CatchEntry } from "@stillwater/shared";

/** A new catch form that starts from this fish: same water, outing, species, lure and measure, but the time is now. */
export function anotherCatchLink(entry: Pick<CatchEntry, "spotId" | "species" | "lure" | "tripId"> & { measure: Pick<CatchEntry["measure"], "kind"> }): string {
  const params = new URLSearchParams({ spot: entry.spotId, species: entry.species, lure: entry.lure, kind: entry.measure.kind });
  if (entry.tripId) params.set("trip", entry.tripId);
  return `/catches/new?${params.toString()}`;
}
