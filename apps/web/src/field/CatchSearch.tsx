import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { catchesNewestFirst, searchCatches, spotById, tripById, type CatchEntry, type Logbook } from "@stillwater/shared";
import { getLang, useLang, useT } from "../i18n";
import { CatchCard } from "./cards";
import { PagedCatches } from "./PagedCatches";
import { catchMonth } from "./tripMonths";
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

export const FIND_PARAM = "find";

/** The field log home, opened with this catch search already typed in. */
export function findLink(text: string): string {
  return `/?${new URLSearchParams({ [FIND_PARAM]: text }).toString()}`;
}

export function CatchSearch() {
  const { book } = useLogbook();
  const t = useT();
  const lang = useLang();
  const [params, setParams] = useSearchParams();
  // The search lives in the address too, so Back from a catch returns to the same matches.
  const [query, setQuery] = useState(() => params.get(FIND_PARAM) ?? "");
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    // Arriving from a link with a search typed in: show the matches, not the top of home.
    const at = box.current;
    if (!params.get(FIND_PARAM) || !at) return;
    // The phone's sticky bar would cover the search box, so stop below it.
    const bar = document.querySelector<HTMLElement>(".field-mobile-bar");
    const below = bar && getComputedStyle(bar).position === "sticky" ? bar.offsetHeight : 0;
    window.scrollTo({ top: at.getBoundingClientRect().top + window.scrollY - below - 12 });
  }, []);
  const needle = query.trim();
  // Typing stays quick in a long book: the results catch up a beat behind the keys.
  const settled = useDeferredValue(needle);
  const matches = useMemo(() => (settled ? findCatches(book, settled, t) : []), [book, settled, t, lang]);

  return (
    <section ref={box} className="catch-search" aria-label={t("Find a catch")}>
      <label htmlFor="catch-search">{t("Find a catch")}</label>
      <input
        id="catch-search"
        type="search"
        value={query}
        placeholder={t("Species, water, or lure")}
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setParams(
            (current) => {
              const out = new URLSearchParams(current);
              if (next.trim()) out.set(FIND_PARAM, next);
              else out.delete(FIND_PARAM);
              return out;
            },
            { replace: true },
          );
        }}
      />
      {settled ? (
        <>
          {/* Only the count is read out; the cards themselves are not a live region. */}
          <p role="status" className={matches.length === 0 ? "empty" : "search-count"}>
            {matches.length === 0 ? t("Nothing in the book matches that.") : t("Matches: {count}", { count: matches.length })}
          </p>
          {matches.length > 0 && (
            <PagedCatches key={settled} items={matches} monthOf={catchMonth}>
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
