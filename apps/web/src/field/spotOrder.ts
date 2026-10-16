import type { Logbook, Spot } from "@stillwater/shared";

export type SpotRow = { spot: Spot; fishCount: number; lastFishAt: string | null };

/** Waters fished most recently first; waters with no fish yet keep the book's order after them. */
export function spotsByLastFish(book: Logbook): SpotRow[] {
  // One pass over the fish for every water, rather than sorting the whole book once per water.
  const tally = new Map<string, { fishCount: number; lastFishAt: string }>();
  for (const entry of book.catches) {
    const row = tally.get(entry.spotId);
    if (!row) tally.set(entry.spotId, { fishCount: 1, lastFishAt: entry.caughtAt });
    else {
      row.fishCount += 1;
      if (entry.caughtAt > row.lastFishAt) row.lastFishAt = entry.caughtAt;
    }
  }
  const rows = book.spots.map((spot, index) => {
    const row = tally.get(spot.id);
    return { spot, fishCount: row?.fishCount ?? 0, lastFishAt: row?.lastFishAt ?? null, index };
  });
  rows.sort((a, b) => {
    if (a.lastFishAt && b.lastFishAt) return b.lastFishAt.localeCompare(a.lastFishAt) || a.index - b.index;
    if (a.lastFishAt) return -1;
    if (b.lastFishAt) return 1;
    return a.index - b.index;
  });
  return rows.map(({ index: _index, ...row }) => row);
}

/**
 * The water a new fish most likely came from: today's outing's water, or of several outings today the one fished
 * most recently; with none today, the water fished most recently; else the book's first.
 */
export function likelyWater(book: Logbook, today: string): string {
  const order = spotsByLastFish(book).map((row) => row.spot.id);
  const todays = new Set(book.trips.filter((trip) => trip.date === today).map((trip) => trip.spotId));
  return order.find((id) => todays.has(id)) ?? order[0] ?? "";
}
