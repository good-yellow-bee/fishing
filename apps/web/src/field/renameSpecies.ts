import { FISH, type Logbook } from "@stillwater/shared";
import { t } from "../i18n";

export type Renamed = { ok: true; book: Logbook; name: string; count: number } | { ok: false; message: string };

/**
 * Every fish of one kind given a new name. A name already in the book (or a lake fish), in any case or in the
 * player's language, is written the way the book has it, so renaming "Pike" to "northern pike" merges the two.
 */
export function renameSpecies(book: Logbook, from: string, typed: string): Renamed {
  const clean = typed.trim().replace(/\s+/g, " ");
  // The same limits as a fish's name on the catch form.
  if (clean.length < 2 || clean.length > 40) return { ok: false, message: "Name the fish, in a few words." };
  const key = from.trim().toLowerCase();
  const others = [...book.catches.map((entry) => entry.species).filter((name) => name.trim().toLowerCase() !== key), ...FISH.map((fish) => fish.name)];
  const name = others.find((other) => other.trim().toLowerCase() === clean.toLowerCase() || t(other).toLowerCase() === clean.toLowerCase()) ?? clean;
  let count = 0;
  const catches = book.catches.map((entry) => {
    if (entry.species.trim().toLowerCase() !== key) return entry;
    count += 1;
    return entry.species === name ? entry : { ...entry, species: name };
  });
  return { ok: true, book: { ...book, catches }, name, count };
}
