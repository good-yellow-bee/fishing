import { personalBests, type CatchEntry, type Logbook } from "@stillwater/shared";

export type CatchBadge = "book" | "species" | null;

/** Whether this fish is the book's biggest, or the biggest of its kind, by the measure it was logged with. */
export function catchBadge(book: Logbook, entry: CatchEntry): CatchBadge {
  const bests = personalBests(book);
  const key = entry.measure.kind === "length" ? "longest" : "heaviest";
  if (bests[key]?.id === entry.id) return "book";
  const kind = bests.species.find((row) => row.species === entry.species);
  const rivals = book.catches.filter((row) => row.species === entry.species && row.measure.kind === entry.measure.kind).length;
  if (rivals > 1 && kind?.[key]?.id === entry.id) return "species";
  return null;
}
