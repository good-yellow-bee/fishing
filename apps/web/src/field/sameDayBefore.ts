import type { Logbook } from "@stillwater/shared";
import { isSampleCatch } from "./bookCopy";
import { withoutPlayLake } from "./playLake";
import { bookFishDay } from "./tripMonths";

/**
 * The same day of an earlier year, the latest one the angler caught on, with its fish counted as `counted` counts them,
 * and the search that opens just those: the game's lake left out, and the sample week's when it isn't counted.
 */
export function sameDayBefore(book: Logbook, day: string, counted: ReadonlySet<string>, sampleWord: string): { day: string; count: number; search: string } | null {
  const own = book.catches.filter((entry) => counted.has(entry.id));
  const before = own.map((entry) => bookFishDay(book, entry)).filter((other) => other.slice(4) === day.slice(4) && other < day);
  const that = before.sort().at(-1);
  if (!that) return null;
  const onThat = book.catches.filter((entry) => bookFishDay(book, entry) === that);
  const count = own.filter((entry) => bookFishDay(book, entry) === that).length;
  const sample = onThat.some((entry) => isSampleCatch(entry.id) && !counted.has(entry.id)) ? ` -${sampleWord}` : "";
  return { day: that, count, search: `${withoutPlayLake(book, that, onThat)}${sample}` };
}
