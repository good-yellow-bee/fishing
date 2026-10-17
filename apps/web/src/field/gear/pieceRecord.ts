import { isLureLabel, localDate, personalBests, type CatchEntry, type Logbook, type TackleItem } from "@stillwater/shared";
import { pieceKey } from "./pieceKey";

/**
 * `lure`: the name the fish were logged under, for opening them; `lastAt`: when the newest of them was caught;
 * `since`: the outings it went on after that day. All three set when the piece took any. `largest`: its biggest fish, by
 * weight when any was weighed, else by length, once it took two or more.
 */
export type PieceRecord = { label: string; outings: number; fish: number; lure?: string; lastAt?: string; since?: number; largest?: { entry: CatchEntry; by: "weight" | "length" } };

/**
 * Each lure packed for outings up to `today`: how many lists it was on, and the fish in the book logged under its
 * commonest spelling, as its search link opens them. Tools and line are left out. Most fish first, then most outings.
 */
export function pieceRecords(book: Logbook, items: readonly TackleItem[], today: string): PieceRecord[] {
  const past = new Set(book.trips.filter((trip) => trip.date <= today).map((trip) => trip.id));
  const dateOf = new Map(book.trips.map((trip) => [trip.id, trip.date]));
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
      // The newest fish under any spelling of the piece: "Spinnerbaits" last week still counts for "Spinnerbait".
      const all = [...spellings.values()].flat();
      const lastAt = all.reduce<string | undefined>((newest, entry) => (!newest || Date.parse(entry.caughtAt) > Date.parse(newest) ? entry.caughtAt : newest), undefined);
      const lastDay = lastAt ? localDate(new Date(lastAt)) : "";
      // Today's outing counts once it is over; until then it may still bring a fish.
      const since = [...row.trips].filter((id) => {
        const date = dateOf.get(id) ?? "";
        return date > lastDay && date < today;
      }).length;
      // Across every spelling, as "last fish" is: one fish is its own biggest and says nothing.
      const bests = all.length >= 2 ? personalBests({ spots: [], trips: [], catches: all }) : null;
      const largest = bests?.heaviest ? { entry: bests.heaviest, by: "weight" as const } : bests?.longest ? { entry: bests.longest, by: "length" as const } : undefined;
      return { label: row.label, outings: row.trips.size, fish: took.length, ...(took[0] && lastAt ? { lure: took[0].lure, lastAt, since } : {}), ...(largest ? { largest } : {}) };
    })
    .sort((a, b) => b.fish - a.fish || b.outings - a.outings || a.label.localeCompare(b.label));
}
