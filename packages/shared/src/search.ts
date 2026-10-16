import { catchesNewestFirst, spotById, type CatchEntry, type Logbook } from "./logbook.ts";

/**
 * Text as a search compares it: lower case, single spaces, and without accents ("Okoń" reads "okon", "Biały" reads
 * "bialy"), since phones often type the plain letters. Each letter stays one letter, so positions still line up.
 */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const normalize = foldText;

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
