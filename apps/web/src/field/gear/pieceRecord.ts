import { isLureLabel, type CatchEntry, type Logbook, type TackleItem } from "@stillwater/shared";
import { pieceKey } from "./pieceKey";

/** `lure`: the name the fish were logged under, for opening them; set when the piece took any. */
export type PieceRecord = { label: string; outings: number; fish: number; lure?: string };

/**
 * Each lure packed for outings up to `today`: how many lists it was on, and the fish in the book logged under its
 * commonest spelling, as its search link opens them. Tools and line are left out. Most fish first, then most outings.
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
      // The spelling most of its fish were logged under, and those fish: what the lure's search link opens.
      const spellings = new Map<string, CatchEntry[]>();
      for (const entry of book.catches) {
        if (pieceKey(entry.lure) !== key) continue;
        const name = entry.lure.trim().toLowerCase();
        spellings.set(name, [...(spellings.get(name) ?? []), entry]);
      }
      const took = [...spellings.values()].sort((a, b) => b.length - a.length)[0] ?? [];
      return { label: row.label, outings: row.trips.size, fish: took.length, ...(took[0] ? { lure: took[0].lure } : {}) };
    })
    .sort((a, b) => b.fish - a.fish || b.outings - a.outings || a.label.localeCompare(b.label));
}
