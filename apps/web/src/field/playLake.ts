import { upcomingTrips, type Logbook, type Trip } from "@stillwater/shared";

/** The game's own lake: what is landed or fished there in play is kept apart from the angler's real days. */
export const PLAY_LAKE_ID = "spot-stillwater";

export const offPlayLake = (each: { spotId: string }) => each.spotId !== PLAY_LAKE_ID;

/** The outings still ahead, today's included, leaving out the game's day on its lake. */
export function upcomingOwnTrips(book: Logbook, today: string): Trip[] {
  return upcomingTrips(book, today).filter(offPlayLake);
}
