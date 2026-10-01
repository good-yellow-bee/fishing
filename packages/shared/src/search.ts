import { catchesNewestFirst, spotById, type CatchEntry, type Logbook } from "./logbook.ts";

function haystack(book: Logbook, entry: CatchEntry): string {
  const water = spotById(book, entry.spotId)?.name ?? "";
  return `${entry.species}\n${water}\n${entry.lure}`.toLowerCase();
}

export function searchCatches(book: Logbook, query: string): CatchEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return catchesNewestFirst(book).filter((entry) => haystack(book, entry).includes(needle));
}
