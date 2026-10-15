import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { catchesNewestFirst, searchCatches, spotById, tripById, type CatchEntry, type Logbook } from "@stillwater/shared";
import { getLang, useLang, useT } from "../i18n";
import { CatchCard } from "./cards";
import { PagedCatches } from "./PagedCatches";
import { catchMonth, monthName } from "./tripMonths";
import { useLogbook } from "./LogbookState";
import "./search.css";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when a word of the fish's month ("October 2026", "Październik 2026") starts with what was typed. */
function monthHas(entry: CatchEntry, want: string): boolean {
  if (want.length < 3) return false;
  const name = normalize(monthName(catchMonth(entry)));
  return name.startsWith(want) || name.split(" ").some((word) => word.startsWith(want));
}

/** The shared search, plus species and lure names as they read in the player's language, the month a fish came in, and released fish. */
function findCatches(book: Logbook, needle: string, t: (text: string) => string): CatchEntry[] {
  const found = searchCatches(book, needle);
  const translated = getLang() !== "en";
  const want = normalize(needle);
  const hit = new Set(found.map((entry) => entry.id));
  // "rel" or "released" finds the fish put back, under both of the words the book uses for them.
  const releasedWords = want.length < 3 ? [] : [t("Released"), t("Released: {count} of {total}").split(":")[0]!].map(normalize);
  for (const entry of book.catches) {
    if (hit.has(entry.id)) continue;
    if (translated && (normalize(t(entry.species)).includes(want) || normalize(t(entry.lure)).includes(want))) hit.add(entry.id);
    else if (monthHas(entry, want) || (entry.released && releasedWords.some((word) => word.startsWith(want)))) hit.add(entry.id);
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
  const linked = params.get(FIND_PARAM) ?? "";
  // What was last typed here, so the address catching up with the box is not taken for a new link.
  const typed = useRef<string | null>(null);
  useEffect(() => {
    // Arriving from a link with a search typed in, even one followed from home itself: show the matches, not the top of home.
    const at = box.current;
    if (!linked || linked === typed.current || !at) return;
    setQuery(linked);
    // The phone's sticky bar would cover the search box, so stop below it.
    const bar = document.querySelector<HTMLElement>(".field-mobile-bar");
    const below = bar && getComputedStyle(bar).position === "sticky" ? bar.offsetHeight : 0;
    window.scrollTo({ top: at.getBoundingClientRect().top + window.scrollY - below - 12 });
  }, [linked]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // "/" jumps to the search from anywhere on home, as on many sites; typing in a field is left alone.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const needle = query.trim();
  // Typing stays quick in a long book: the results catch up a beat behind the keys.
  const settled = useDeferredValue(needle);
  const matches = useMemo(() => (settled ? findCatches(book, settled, t) : []), [book, settled, t, lang]);

  return (
    <section ref={box} className="catch-search" aria-label={t("Find a catch")}>
      <label htmlFor="catch-search">{t("Find a catch")}</label>
      <input
        ref={input}
        id="catch-search"
        type="search"
        aria-keyshortcuts="/"
        value={query}
        placeholder={t("Species, water, lure, or month")}
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value;
          typed.current = next;
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
            <PagedCatches key={settled} items={matches} monthOf={catchMonth} headLevel={2}>
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
