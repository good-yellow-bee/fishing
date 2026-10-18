import type { CatchEntry, Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { isSampleCatch } from "./bookCopy";
import { countedBook, countedFish } from "./milestones";
import { withoutPlayLake } from "./playLake";

/**
 * A catch search `term` that opens the fish a count beside it counted (countedFish): never the game's lake, and not
 * the sample week once the angler has fish of their own, when any of `rows` are those. `by: "book"` counts as
 * countedBook does, which leaves the sample out once the angler has an outing of their own too.
 */
export function countedSearch(book: Logbook, term: string, rows: readonly CatchEntry[], by: "fish" | "book" = "fish"): string {
  const search = withoutPlayLake(book, term, rows);
  const counted = by === "book" ? countedBook(book).catches : countedFish(book.catches);
  const own = counted.length > 0 ? counted.some((entry) => !isSampleCatch(entry.id)) : by === "book" && book.catches.some((entry) => isSampleCatch(entry.id));
  return own && rows.some((entry) => isSampleCatch(entry.id)) ? `${search} -${t("sample|search word")}`.trim() : search;
}
