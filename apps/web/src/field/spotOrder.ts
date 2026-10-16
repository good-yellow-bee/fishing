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

const EARTH_KM = 6371;

/** Kilometres between two points on the map, along the ground. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The water with a pin nearest to where the player stands, and how far it is; null when no water has a pin. */
export function nearestWater(book: Logbook, here: { lat: number; lng: number }): { spot: Spot; km: number } | null {
  let best: { spot: Spot; km: number } | null = null;
  for (const spot of book.spots) {
    if (!spot.place) continue;
    const km = kmBetween(here, spot.place);
    if (!best || km < best.km) best = { spot, km };
  }
  return best;
}
