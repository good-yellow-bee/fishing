import type { Logbook } from "@stillwater/shared";
import { catchMonth, daysOut } from "../tripMonths";

/** One season's totals beside the season before, and the kinds it brought into the book for the first time. */
export type SeasonRecap = {
  year: string;
  before: string;
  fish: number;
  fishBefore: number;
  days: number;
  daysBefore: number;
  kinds: number;
  kindsBefore: number;
  /** Kinds whose first fish in the book came this season, as stored, in the order they first came. */
  newKinds: string[];
};

export function seasonRecap(book: Logbook, year: string, today: string): SeasonRecap {
  const before = String(Number(year) - 1);
  const of = (season: string) => book.catches.filter((entry) => catchMonth(entry).startsWith(`${season}-`));
  const kinds = (season: string) => new Set(of(season).map((entry) => entry.species.trim().toLowerCase())).size;
  // The first fish of each kind in the whole book, oldest first: those from this season are new to the book.
  const first = new Map<string, { name: string; at: string }>();
  for (const entry of [...book.catches].sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))) {
    const key = entry.species.trim().toLowerCase();
    if (!first.has(key)) first.set(key, { name: entry.species, at: catchMonth(entry) });
  }
  return {
    year,
    before,
    fish: of(year).length,
    fishBefore: of(before).length,
    days: daysOut(book, year, today),
    daysBefore: daysOut(book, before, today),
    kinds: kinds(year),
    kindsBefore: kinds(before),
    newKinds: [...first.values()].filter((row) => row.at.startsWith(`${year}-`)).map((row) => row.name),
  };
}
