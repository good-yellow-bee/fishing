import { FISH, type CatchEntry, type Logbook } from "@stillwater/shared";
import { t } from "../i18n";

export type Renamed = { ok: true; book: Logbook; name: string; count: number } | { ok: false; message: string };

/** What a name is given for: a kind of fish, or a lure or bait. */
export type NameField = "species" | "lure";

/**
 * Every fish of one kind, or caught on one lure, given a new name. A name already in the book (or a lake fish), in
 * any case or in the player's language, is written the way the book has it, so renaming "Pike" to "northern pike"
 * merges the two.
 */
export function renameInBook(book: Logbook, field: NameField, from: string, typed: string): Renamed {
  const clean = typed.trim().replace(/\s+/g, " ");
  // The same limits as the catch form's.
  if (field === "species" && (clean.length < 2 || clean.length > 40)) return { ok: false, message: "Name the fish, in a few words." };
  if (field === "lure" && (clean.length < 2 || clean.length > 60)) return { ok: false, message: "What was on the line?" };
  const key = from.trim().toLowerCase();
  const nameOf = (entry: CatchEntry) => entry[field];
  const others = [
    ...book.catches.map(nameOf).filter((name) => name.trim().toLowerCase() !== key),
    ...(field === "species" ? FISH.map((fish) => fish.name) : []),
  ];
  const want = clean.toLowerCase();
  const name = others.find((other) => other.trim().toLowerCase() === want || t(other).toLowerCase() === want) ?? clean;
  let count = 0;
  const catches = book.catches.map((entry) => {
    if (nameOf(entry).trim().toLowerCase() !== key) return entry;
    count += 1;
    return entry[field] === name ? entry : { ...entry, [field]: name };
  });
  return { ok: true, book: { ...book, catches }, name, count };
}
