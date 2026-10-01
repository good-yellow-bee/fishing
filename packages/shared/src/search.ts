import { catchesNewestFirst, spotById, type Logbook } from "./logbook.ts";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function fieldHas(field: string, needle: string): boolean {
  return normalize(field).includes(needle);
}

export function searchCatches(book: Logbook, query: string): CatchEntry[] {
  const needle = normalize(query);
  if (!needle) return [];
  return catchesNewestFirst(book).filter((entry) => {
    const water = spotById(book, entry.spotId)?.name ?? "";
    return fieldHas(entry.species, needle) || fieldHas(water, needle) || fieldHas(entry.lure, needle);
  });
}
