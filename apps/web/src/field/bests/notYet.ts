import type { CatchEntry } from "@stillwater/shared";
import { countedFish } from "../milestones";

/** The kinds caught last year that haven't come in yet this year, by their name as last logged, alphabetical. */
export function notYetThisYear(catches: readonly CatchEntry[], today: Date = new Date()): string[] {
  const year = today.getFullYear();
  const lastYear = new Map<string, string>();
  const thisYear = new Set<string>();
  for (const entry of countedFish(catches)) {
    const at = new Date(entry.caughtAt);
    const kind = entry.species.trim().toLowerCase();
    if (at.getFullYear() === year) thisYear.add(kind);
    else if (at.getFullYear() === year - 1) lastYear.set(kind, entry.species.trim());
  }
  return [...lastYear.entries()]
    .filter(([kind]) => !thisYear.has(kind))
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b));
}
