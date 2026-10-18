import type { Logbook } from "@stillwater/shared";
import { bookFishDay, daysOut } from "../tripMonths";
import { countedFish } from "../milestones";

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
  /** The season is still going, so the one before counts only up to the same day ("2025-10-16"); else null. */
  beforeUntil: string | null;
  /** Kinds whose first fish in the book came this season, as stored, in the order they first came. */
  newKinds: string[];
};

export function seasonRecap(book: Logbook, year: string, today: string): SeasonRecap {
  const before = String(Number(year) - 1);
  // Each fish on the day it counts on, a night session's small hours on its outing's, as the days out, the goal and the
  // copied summary count it.
  const dayOf = (entry: Logbook["catches"][number]) => bookFishDay(book, entry);
  // This season so far is set against the one before up to the same day, not the whole of it.
  const beforeUntil = year === today.slice(0, 4) ? `${before}-${today.slice(5)}` : null;
  const cut = beforeUntil
    ? {
        ...book,
        catches: book.catches.filter((entry) => !dayOf(entry).startsWith(`${before}-`) || dayOf(entry) <= beforeUntil),
        trips: book.trips.filter((trip) => !trip.date.startsWith(`${before}-`) || trip.date <= beforeUntil),
      }
    : book;
  const of = (season: string) => (season === before ? cut : book).catches.filter((entry) => dayOf(entry).startsWith(`${season}-`));
  const kinds = (season: string) => new Set(of(season).map((entry) => entry.species.trim().toLowerCase())).size;
  // The first fish of each kind in the whole book, oldest first: those from this season are new to the book.
  const first = new Map<string, { name: string; at: string }>();
  for (const entry of [...countedFish(book.catches)].sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))) {
    const key = entry.species.trim().toLowerCase();
    if (!first.has(key)) first.set(key, { name: entry.species, at: dayOf(entry) });
  }
  return {
    year,
    before,
    fish: of(year).length,
    fishBefore: of(before).length,
    days: daysOut(book, year, today),
    daysBefore: daysOut(cut, before, today),
    kinds: kinds(year),
    kindsBefore: kinds(before),
    beforeUntil,
    newKinds: [...first.values()].filter((row) => row.at.startsWith(`${year}-`)).map((row) => row.name),
  };
}
