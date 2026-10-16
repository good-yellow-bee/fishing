import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BITE_TIMES, MOON_QUARTER_LABELS, SEASON_LABELS, SKY_LABELS, WATER_LABELS, WIND_LABELS, biteTimeOf, catchesNewestFirst, lakeSeason, localDate, moonQuarterOf, searchCatches, spotById, tripById, type CatchEntry, type Logbook } from "@stillwater/shared";
import { getLang, useLang, useT } from "../i18n";
import { CatchCard } from "./cards";
import { catchesCsv } from "./catchCsv";
import { downloadFile } from "./download";
import { FishSum } from "./FishSum";
import { PagedCatches } from "./PagedCatches";
import { catchMonth, monthName } from "./tripMonths";
import { noteText } from "./format";
import { useLogbook } from "./LogbookState";
import "./search.css";
import { FIND_PARAM, parseExactTerm } from "./findLinks";
import { parseSizeQuery, parseTempQuery, sizeMatches, tempMatches } from "./sizeQuery";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when a word of the fish's month ("October 2026", "Październik 2026") starts with what was typed. */
function monthHas(entry: CatchEntry, want: string): boolean {
  if (want.length < 3) return false;
  const name = normalize(monthName(catchMonth(entry)));
  return name.startsWith(want) || name.split(" ").some((word) => word.startsWith(want));
}

/** True when the kind of water the fish came from ("River", "Rzeka") starts with what was typed, from three letters up. */
function waterTypeHas(book: Logbook, entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  const type = want.length < 3 ? undefined : spotById(book, entry.spotId)?.waterType;
  return type !== undefined && normalize(t(WATER_LABELS[type])).startsWith(want);
}

/** True when a word of the sky the fish came under ("Partly cloudy", "Deszcz") starts with what was typed, from three letters up. */
function skyHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3 || !entry.weather) return false;
  const name = normalize(t(SKY_LABELS[entry.weather.sky]));
  return name.startsWith(want) || name.split(" ").some((word) => word.startsWith(want));
}

/** True when a word of the wind the fish came in ("Light north", "Słaby z północy") starts with what was typed, from three letters up. */
function windHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3 || !entry.weather) return false;
  const name = normalize(t(WIND_LABELS[entry.weather.wind]));
  return name.startsWith(want) || name.split(" ").some((word) => word.startsWith(want));
}

/** True when the season the fish came in ("Fall", "Jesień") starts with what was typed, from three letters up. */
function seasonHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const at = new Date(entry.caughtAt);
  return !Number.isNaN(at.getTime()) && normalize(t(SEASON_LABELS[lakeSeason(at)])).startsWith(want);
}

/** True when the part of the day the fish came at ("Dawn", "Wieczór") starts with what was typed, from three letters up. */
function timeHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const at = new Date(entry.caughtAt);
  if (Number.isNaN(at.getTime())) return false;
  const id = biteTimeOf(at.getHours());
  const band = BITE_TIMES.find((row) => row.id === id)!;
  return normalize(t(band.label)).startsWith(want);
}

/** True when the week of the moon the fish came in ("Waxing moon", "Near the full moon") starts with what was typed, from three letters up. */
function moonHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const at = new Date(entry.caughtAt);
  return !Number.isNaN(at.getTime()) && normalize(t(MOON_QUARTER_LABELS[moonQuarterOf(at)])).startsWith(want);
}

/** The shared search, plus species and lure names as they read in the player's language, the month a fish came in, the kind of water, the sky, the wind, the season, the time of day, the moon, the outing's title, words from a note, and released fish. */
function findOne(book: Logbook, needle: string, t: (text: string) => string): CatchEntry[] {
  // ">2 lb", "<30 cm": the fish on that side of a size.
  const exact = parseExactTerm(needle);
  if (exact) {
    // One name whole, as stored or as it reads in the player's language.
    const want = normalize(exact.name);
    const named = (name: string) => normalize(name) === want || normalize(t(name)) === want;
    return catchesNewestFirst(book).filter((entry) =>
      exact.field === "species" ? named(entry.species) : exact.field === "lure" ? named(entry.lure) : named(spotById(book, entry.spotId)?.name ?? ""),
    );
  }
  // "2026-10-12": the fish of that local day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(needle.trim())) return catchesNewestFirst(book).filter((entry) => localDate(new Date(entry.caughtAt)) === needle.trim());
  // ">60°F", "<15°C": the fish from water on that side of a temperature.
  const temp = parseTempQuery(needle);
  if (temp) return catchesNewestFirst(book).filter((entry) => tempMatches(entry.weather?.waterTempF, temp));
  const size = parseSizeQuery(needle);
  if (size) return catchesNewestFirst(book).filter((entry) => sizeMatches(entry.measure, size));
  const found = searchCatches(book, needle);
  const translated = getLang() !== "en";
  const want = normalize(needle);
  const hit = new Set(found.map((entry) => entry.id));
  // "rel" or "released" finds the fish put back, under both of the words the book uses for them.
  // An outing's title ("Opening day") finds the fish filed on it, from three letters up.
  const tripsNamed = new Set(want.length < 3 ? [] : book.trips.filter((trip) => normalize(trip.title).includes(want)).map((trip) => trip.id));
  // Words from a fish's own note, or from its outing's note, find it too, from three letters up.
  const tripsNoted = new Set(want.length < 3 ? [] : book.trips.filter((trip) => normalize(trip.note).includes(want)).map((trip) => trip.id));
  const releasedWords = want.length < 3 ? [] : [t("Released"), t("Released: {count} of {total}").split(":")[0]!].map(normalize);
  for (const entry of book.catches) {
    if (hit.has(entry.id)) continue;
    if (translated && (normalize(t(entry.species)).includes(want) || normalize(t(entry.lure)).includes(want))) hit.add(entry.id);
    else if (
      monthHas(entry, want) ||
      (entry.released && releasedWords.some((word) => word.startsWith(want))) ||
      waterTypeHas(book, entry, want, t) ||
      skyHas(entry, want, t) ||
      windHas(entry, want, t) ||
      seasonHas(entry, want, t) ||
      timeHas(entry, want, t) ||
      moonHas(entry, want, t) ||
      (entry.tripId !== null && tripsNamed.has(entry.tripId)) ||
      (entry.tripId !== null && tripsNoted.has(entry.tripId)) ||
      (want.length >= 3 && normalize(noteText(entry.note)).includes(want))
    )
      hit.add(entry.id);
  }
  return catchesNewestFirst(book).filter((entry) => hit.has(entry.id));
}

/** Splits a search on "+", but not inside a name in the book that has a "+" of its own ("Pond + creek"). */
export function searchParts(book: Logbook, needle: string): string[] {
  const names = [...book.spots.map((spot) => spot.name), ...book.trips.map((trip) => trip.title), ...book.catches.flatMap((entry) => [entry.species, entry.lure])]
    .filter((name) => name.includes("+"))
    .sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  let text = needle;
  for (const name of names) {
    const at = text.toLowerCase().indexOf(name.toLowerCase());
    if (at < 0) continue;
    kept.push(text.slice(at, at + name.length));
    text = `${text.slice(0, at)}\u0000${kept.length - 1}\u0000${text.slice(at + name.length)}`;
  }
  return text
    .split("+")
    .map((part) => part.replace(/\u0000(\d+)\u0000/g, (_, index: string) => kept[Number(index)]!).trim())
    .filter(Boolean);
}

/** One search, or several joined with "+" ("Northern pike + Overcast"): then only the fish every part finds. */
function findCatches(book: Logbook, needle: string, t: (text: string) => string): CatchEntry[] {
  const parts = searchParts(book, needle);
  if (parts.length < 2) return findOne(book, needle, t);
  let found = findOne(book, parts[0]!, t);
  for (const part of parts.slice(1)) {
    const hit = new Set(findOne(book, part, t).map((entry) => entry.id));
    found = found.filter((entry) => hit.has(entry.id));
  }
  return found;
}

export { FIND_PARAM, exactTerm, findLink, findWithLink } from "./findLinks";

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
    <section
      ref={box}
      className="catch-search"
      aria-label={t("Find a catch")}
      // Arriving by a search link, focus lands here rather than on the page heading.
      tabIndex={linked ? -1 : undefined}
      data-focus-target={linked ? "" : undefined}
    >
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
          {matches.length > 1 ? (
            // Several matches: what they add up to, from the count to the largest among them.
            <div role="status" className="search-count">
              <FishSum catches={matches} />
            </div>
          ) : (
            <p role="status" className={matches.length === 0 ? "empty" : "search-count"}>
              {matches.length === 0 ? t("Nothing in the book matches that.") : t("Matches: {count}", { count: matches.length })}
            </p>
          )}
          {matches.length === 0 ? (
            <p className="search-tip">{t("Try a species, a water, a lure, a month or season, a time of day such as “dawn”, a sky such as “overcast”, a wind such as “breezy”, a kind of water such as “river”, a size such as “>2 lb”, a water temperature such as “>60°F”, a word from a note, a day such as “2026-10-12”, or “released”. Join two with “+”.")}</p>
          ) : null}
          {matches.length > 0 ? (
            <p className="search-save">
              <button
                type="button"
                className="text-button"
                onClick={() => downloadFile(catchesCsv({ ...book, catches: matches }), "text/csv;charset=utf-8", "stillwater-catches.csv")}
              >
                {t("Download these as a spreadsheet")}
              </button>
            </p>
          ) : null}
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
