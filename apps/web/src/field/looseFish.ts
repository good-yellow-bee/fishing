import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { toLocalInput } from "./format";
import { fishOnOutingDay, tripForFish } from "./suggestions";

/**
 * The fish from an outing's water logged without an outing that this outing should offer to take: those whose own page
 * names it (the nearer of a dawn and a dusk, last evening's for a night fish). While the outing that page names has no
 * fish yet the pick is only a guess, so every outing on the fish's day offers it.
 */
export function looseFishFor(book: Logbook, trip: Trip): CatchEntry[] {
  return book.catches.filter((entry) => {
    if (entry.tripId !== null || entry.spotId !== trip.spotId) return false;
    const local = toLocalInput(new Date(entry.caughtAt));
    const named = tripForFish(book, trip.spotId, local);
    if (named?.id === trip.id) return true;
    const guess = !named || !book.catches.some((other) => other.tripId === named.id);
    return guess && fishOnOutingDay(book, trip.spotId, local, trip.date);
  });
}
