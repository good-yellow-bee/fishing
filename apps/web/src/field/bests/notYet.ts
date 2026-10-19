import { localDate, type CatchEntry } from "@stillwater/shared";
import { countedFish } from "../milestones";
import { kindKey } from "../speciesLink";
import { locale } from "../../i18n";

/**
 * The kinds caught last year that haven't come in yet this year, each under the spelling most of last year's fish
 * carry, alphabetical. `nameOf` groups by something else, such as the lure. `dayOf` dates a fish ("2026-01-01"): a page
 * that files a night fish under its outing's day passes its own. `keyOf` says which names are one: by default by kindKey,
 * so "Perches", "perch " and "Perch" are one kind in any language.
 */
export function notYetThisYear(
  catches: readonly CatchEntry[],
  today: Date = new Date(),
  nameOf: (entry: CatchEntry) => string = (entry) => entry.species,
  dayOf: (entry: CatchEntry) => string = (entry) => localDate(new Date(entry.caughtAt)),
  keyOf: (name: string) => string = kindKey,
): string[] {
  const year = today.getFullYear();
  const lastYear = new Map<string, Map<string, number>>();
  const thisYear = new Set<string>();
  for (const entry of countedFish(catches)) {
    const at = Number(dayOf(entry).slice(0, 4));
    const name = nameOf(entry).trim();
    if (!name) continue;
    const kind = keyOf(name);
    if (at === year) thisYear.add(kind);
    else if (at === year - 1) {
      const spellings = lastYear.get(kind) ?? new Map<string, number>();
      spellings.set(name, (spellings.get(name) ?? 0) + 1);
      lastYear.set(kind, spellings);
    }
  }
  return [...lastYear.entries()]
    .filter(([kind]) => !thisYear.has(kind))
    .map(([, spellings]) => [...spellings].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0])
    .sort((a, b) => a.localeCompare(b));
}

/** Names in the order the reader's words for them sort in: "Okoń" before "Sandacz" in Polish, whatever is stored. */
export function inReadersOrder(names: readonly string[], show: (name: string) => string): string[] {
  return names.map((name) => [name, show(name)] as const).sort((a, b) => a[1].localeCompare(b[1], locale())).map(([name]) => name);
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
