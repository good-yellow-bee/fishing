import { catchesNewestFirst, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";

export type Neighbors<T> = { newer: T | null; older: T | null };

/** The rows either side of `id` in a list already newest first. */
export function neighborsIn<T extends { id: string }>(rows: readonly T[], id: string): Neighbors<T> {
  const at = rows.findIndex((row) => row.id === id);
  if (at < 0) return { newer: null, older: null };
  return { newer: rows[at - 1] ?? null, older: rows[at + 1] ?? null };
}

export function catchNeighbors(book: Logbook, id: string): Neighbors<CatchEntry> {
  return neighborsIn(catchesNewestFirst(book), id);
}

export function tripNeighbors(book: Logbook, id: string): Neighbors<Trip> {
  const rows = [...book.trips].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return neighborsIn(rows, id);
}
