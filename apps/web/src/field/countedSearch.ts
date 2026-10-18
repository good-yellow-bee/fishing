import type { CatchEntry, Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { isSampleCatch } from "./bookCopy";
import { countedFish } from "./milestones";
import { withoutPlayLake } from "./playLake";

/**
 * A catch search `term` that opens the fish a count beside it counted (countedFish): never the game's lake, and not
 * the sample week once the angler has fish of their own, when any of `rows` are those.
 */
export function countedSearch(book: Logbook, term: string, rows: readonly CatchEntry[]): string {
  const search = withoutPlayLake(book, term, rows);
  const ownFish = countedFish(book.catches).some((entry) => !isSampleCatch(entry.id));
  return ownFish && rows.some((entry) => isSampleCatch(entry.id)) ? `${search} -${t("sample|search word")}`.trim() : search;
}
