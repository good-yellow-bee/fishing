import { localDate, type Logbook } from "@stillwater/shared";

/** The local day the book's fish came in the most kinds, once a day has two or more; a tie goes to the latest day. */
export function mostKindsDay(book: Logbook): { date: string; kinds: number } | null {
  const days = new Map<string, Set<string>>();
  for (const entry of book.catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const day = localDate(at);
    days.set(day, (days.get(day) ?? new Set()).add(entry.species.trim().toLowerCase()));
  }
  let best: { date: string; kinds: number } | null = null;
  for (const [date, kinds] of days) {
    if (!best || kinds.size > best.kinds || (kinds.size === best.kinds && date > best.date)) best = { date, kinds: kinds.size };
  }
  return best && best.kinds >= 2 ? best : null;
}
