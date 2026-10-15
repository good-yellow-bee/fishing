import { useDeferredValue, useMemo, useState } from "react";
import { catchesNewestFirst, searchCatches, spotById, tripById, type CatchEntry, type Logbook } from "@stillwater/shared";
import { getLang, useLang, useT } from "../i18n";
import { CatchCard } from "./cards";
import { PagedCatches } from "./PagedCatches";
import { useLogbook } from "./LogbookState";
import "./search.css";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The shared search, plus species and lure names as they read in the player's language. */
function findCatches(book: Logbook, needle: string, t: (text: string) => string): CatchEntry[] {
  const found = searchCatches(book, needle);
  if (getLang() === "en") return found;
  const want = normalize(needle);
  const hit = new Set(found.map((entry) => entry.id));
  for (const entry of book.catches) {
    if (hit.has(entry.id)) continue;
    if (normalize(t(entry.species)).includes(want) || normalize(t(entry.lure)).includes(want)) hit.add(entry.id);
  }
  return catchesNewestFirst(book).filter((entry) => hit.has(entry.id));
}

export function CatchSearch() {
  const { book } = useLogbook();
  const t = useT();
  const lang = useLang();
  const [query, setQuery] = useState("");
  const needle = query.trim();
  // Typing stays quick in a long book: the results catch up a beat behind the keys.
  const settled = useDeferredValue(needle);
  const matches = useMemo(() => (settled ? findCatches(book, settled, t) : []), [book, settled, t, lang]);

  return (
    <section className="catch-search" aria-label={t("Find a catch")}>
      <label htmlFor="catch-search">{t("Find a catch")}</label>
      <input
        id="catch-search"
        type="search"
        value={query}
        placeholder={t("Species, water, or lure")}
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
      />
      {settled ? (
        <>
          {/* Only the count is read out; the cards themselves are not a live region. */}
          <p role="status" className={matches.length === 0 ? "empty" : "search-count"}>
            {matches.length === 0 ? t("Nothing in the book matches that.") : t("Matches: {count}", { count: matches.length })}
          </p>
          {matches.length > 0 && (
            <PagedCatches key={settled} items={matches}>
              {(entry) => (
                <CatchCard
                  key={entry.id}
                  entry={entry}
                  spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                  tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
                />
              )}
            </PagedCatches>
          )}
        </>
      ) : null}
    </section>
  );
}
