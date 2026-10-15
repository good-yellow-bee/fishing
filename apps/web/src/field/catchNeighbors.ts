import { catchesNewestFirst, type CatchEntry, type Logbook } from "@stillwater/shared";

export type CatchNeighbors = { newer: CatchEntry | null; older: CatchEntry | null };

export function catchNeighbors(book: Logbook, id: string): CatchNeighbors {
  const rows = catchesNewestFirst(book);
  const at = rows.findIndex((entry) => entry.id === id);
  if (at < 0) return { newer: null, older: null };
  return { newer: rows[at - 1] ?? null, older: rows[at + 1] ?? null };
}
