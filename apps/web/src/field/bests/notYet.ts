import type { CatchEntry } from "@stillwater/shared";
import { countedFish } from "../milestones";

/**
 * The kinds caught last year that haven't come in yet this year, by their name as last logged, alphabetical. `nameOf`
 * groups by something else, such as the lure.
 */
export function notYetThisYear(catches: readonly CatchEntry[], today: Date = new Date(), nameOf: (entry: CatchEntry) => string = (entry) => entry.species): string[] {
  const year = today.getFullYear();
  const lastYear = new Map<string, string>();
  const thisYear = new Set<string>();
  for (const entry of countedFish(catches)) {
    const at = new Date(entry.caughtAt);
    const name = nameOf(entry).trim();
    if (!name) continue;
    const kind = name.toLowerCase();
    if (at.getFullYear() === year) thisYear.add(kind);
    else if (at.getFullYear() === year - 1) lastYear.set(kind, name);
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
export function newWatersThisYear(catches: readonly CatchEntry[], today: Date = new Date()): string[] {
  const year = today.getFullYear();
  const first = new Map<string, string>();
  let earlier = false;
  for (const entry of countedFish(catches)) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime()) || at.getFullYear() > year) continue;
    if (at.getFullYear() < year) earlier = true;
    const held = first.get(entry.spotId);
    if (!held || entry.caughtAt < held) first.set(entry.spotId, entry.caughtAt);
  }
  if (!earlier) return [];
  return [...first.entries()]
    .filter(([, at]) => new Date(at).getFullYear() === year)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([spotId]) => spotId);
}
