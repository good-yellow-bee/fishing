import { isLureLabel, type Logbook, type TackleItem } from "@stillwater/shared";
import { pieceKey } from "./pieceKey";

/** `lure`: the name the fish were logged under, for opening them; set when the piece took any. */
export type PieceRecord = { label: string; outings: number; fish: number; lure?: string };

/**
 * Each lure's record over the outings it went on, up to `today`: how many lists it was on, and how many fish came on it
 * during those outings. Tools and line are left out. Most fish first, then most outings; pieces never taken are left out.
 */
export function pieceRecords(book: Logbook, items: readonly TackleItem[], today: string): PieceRecord[] {
  const past = new Set(book.trips.filter((trip) => trip.date <= today).map((trip) => trip.id));
  const byPiece = new Map<string, { label: string; trips: Set<string> }>();
  for (const item of items) {
    if (!past.has(item.tripId) || !isLureLabel(item.label)) continue;
    const key = pieceKey(item.label);
    const row = byPiece.get(key) ?? { label: item.label.trim(), trips: new Set<string>() };
    row.trips.add(item.tripId);
    byPiece.set(key, row);
  }
  return [...byPiece.entries()]
    .map(([key, row]) => {
      const took = book.catches.filter((entry) => entry.tripId && row.trips.has(entry.tripId) && pieceKey(entry.lure) === key);
      return { label: row.label, outings: row.trips.size, fish: took.length, ...(took[0] ? { lure: took[0].lure } : {}) };
    })
    .sort((a, b) => b.fish - a.fish || b.outings - a.outings || a.label.localeCompare(b.label));
}
