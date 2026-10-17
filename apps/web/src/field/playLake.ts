import { upcomingTrips, type Logbook, type Trip } from "@stillwater/shared";
import { exactTerm } from "./findLinks";

/** The game's own lake: what is landed or fished there in play is kept apart from the angler's real days. */
export const PLAY_LAKE_ID = "spot-stillwater";

export const offPlayLake = (each: { spotId: string }) => each.spotId !== PLAY_LAKE_ID;

/** The outings still ahead, today's included, leaving out the game's day on its lake. */
export function upcomingOwnTrips(book: Logbook, today: string): Trip[] {
  return upcomingTrips(book, today).filter(offPlayLake);
}

/** A catch search `term` that leaves out the game's lake when any of `rows` came from it, so its link opens the fish counted. */
export function withoutPlayLake(book: Logbook, term: string, rows: readonly { spotId: string }[]): string {
  const lake = book.spots.find((spot) => spot.id === PLAY_LAKE_ID);
  return lake && rows.some((row) => !offPlayLake(row)) ? `${term} -${exactTerm("water", lake.name)}` : term;
}
