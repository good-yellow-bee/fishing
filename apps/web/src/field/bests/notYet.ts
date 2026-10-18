import { localDate, type CatchEntry } from "@stillwater/shared";
import { countedFish } from "../milestones";

/**
 * The kinds caught last year that haven't come in yet this year, by their name as last logged, alphabetical. `nameOf`
 * groups by something else, such as the lure.
 */
/** `dayOf` dates a fish ("2026-01-01"): a page that files a night fish under its outing's day passes its own. */
export function notYetThisYear(
  catches: readonly CatchEntry[],
  today: Date = new Date(),
  nameOf: (entry: CatchEntry) => string = (entry) => entry.species,
  dayOf: (entry: CatchEntry) => string = (entry) => localDate(new Date(entry.caughtAt)),
): string[] {
  const year = today.getFullYear();
  const lastYear = new Map<string, string>();
  const thisYear = new Set<string>();
  for (const entry of countedFish(catches)) {
    const at = Number(dayOf(entry).slice(0, 4));
    const name = nameOf(entry).trim();
    if (!name) continue;
    const kind = name.toLowerCase();
    if (at === year) thisYear.add(kind);
    else if (at === year - 1) lastYear.set(kind, name);
  }
  return [...lastYear.entries()]
    .filter(([kind]) => !thisYear.has(kind))
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * The waters whose first fish came this year, oldest first, once the book has fish from an earlier year: in a book
 * begun this year every water is new and the line would say nothing.
 */
export function newWatersThisYear(
  catches: readonly CatchEntry[],
  today: Date = new Date(),
  dayOf: (entry: CatchEntry) => string = (entry) => localDate(new Date(entry.caughtAt)),
): string[] {
  const year = today.getFullYear();
  const first = new Map<string, string>();
  let earlier = false;
  for (const entry of countedFish(catches)) {
    if (Number.isNaN(Date.parse(entry.caughtAt))) continue;
    // The day it counts on, with its time to order fish of one day: a night fish files under its outing's day.
    const at = `${dayOf(entry)} ${entry.caughtAt}`;
    const fishYear = Number(at.slice(0, 4));
    if (fishYear > year) continue;
    if (fishYear < year) earlier = true;
    const held = first.get(entry.spotId);
    if (!held || at < held) first.set(entry.spotId, at);
  }
  if (!earlier) return [];
  return [...first.entries()]
    .filter(([, at]) => Number(at.slice(0, 4)) === year)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([spotId]) => spotId);
}
