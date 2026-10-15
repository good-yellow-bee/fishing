import { catchesForSpot, type Logbook, type Spot } from "@stillwater/shared";

export type SpotRow = { spot: Spot; fishCount: number; lastFishAt: string | null };

/** Waters fished most recently first; waters with no fish yet keep the book's order after them. */
export function spotsByLastFish(book: Logbook): SpotRow[] {
  const rows = book.spots.map((spot, index) => {
    const catches = catchesForSpot(book, spot.id);
    return { spot, fishCount: catches.length, lastFishAt: catches[0]?.caughtAt ?? null, index };
  });
  rows.sort((a, b) => {
    if (a.lastFishAt && b.lastFishAt) return b.lastFishAt.localeCompare(a.lastFishAt) || a.index - b.index;
    if (a.lastFishAt) return -1;
    if (b.lastFishAt) return 1;
    return a.index - b.index;
  });
  return rows.map(({ index: _index, ...row }) => row);
}
