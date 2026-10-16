import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BITE_TIMES, MOON_QUARTER_LABELS, type MoonQuarter, SEASON_LABELS, SKY_LABELS, WATER_LABELS, WIND_LABELS, biteTimeOf, catchesNewestFirst, foldText, lakeSeason, localDate, measuresOf, moonQuarterOf, searchCatches, spotById, tripById, type CatchEntry, type Logbook } from "@stillwater/shared";
import { getLang, useLang, useT } from "../i18n";
import { CatchCard } from "./cards";
import { CopySummary } from "./CopySummary";
import { RenameKind } from "./RenameKind";
import { searchSummary } from "./summaries";
import { catchesCsv } from "./catchCsv";
import { datedName, downloadFile } from "./download";
import { FishSum } from "./FishSum";
import { PagedCatches } from "./PagedCatches";
import { catchMonth, monthName } from "./tripMonths";
import { noteText } from "./format";
import { useLogbook } from "./LogbookState";
import "./search.css";
import { FIND_PARAM, parseExactTerm, type ExactField } from "./findLinks";
import { parseSizeQuery, parseTempQuery, sizeMatches, tempMatches } from "./sizeQuery";
import { largestFirst } from "./largestFirst";
import { dateWords } from "./dateWords";

/** In the address beside the search, so Back from a fish keeps the order: "largest", or left out for newest first. */
const ORDER_PARAM = "order";

const normalize = foldText;

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

/** Other words anglers use for a part of the day, in English and Polish: "dusk" is the evening, "świt" the dawn. */
const TIME_WORDS: Partial<Record<(typeof BITE_TIMES)[number]["id"], string[]>> = {
  dawn: ["sunrise", "first light", "daybreak", "świt", "wschód", "brzask"],
  midday: ["noon", "południe"],
  evening: ["dusk", "sunset", "zmierzch", "zmrok", "zachód"],
  night: ["dark", "noc"],
};

/** True when the part of the day the fish came at ("Dawn", "Wieczór", or a word for it such as "dusk") starts with what was typed, from three letters up. */
function timeHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const at = new Date(entry.caughtAt);
  if (Number.isNaN(at.getTime())) return false;
  const id = biteTimeOf(at.getHours());
  const band = BITE_TIMES.find((row) => row.id === id)!;
  return [t(band.label), ...(TIME_WORDS[id] ?? [])].some((word) => normalize(word).startsWith(want));
}

/** True when the week of the moon the fish came in ("Waxing moon", "Near the full moon") has a word starting what was typed ("full moon"), from three letters up. */
function moonHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const at = new Date(entry.caughtAt);
  if (Number.isNaN(at.getTime())) return false;
  const quarter = moonQuarterOf(at);
  if ((MOON_WORDS[quarter] ?? []).some((word) => normalize(word).startsWith(want))) return true;
  if (MOON_FILLER.has(want)) return false;
  const label = normalize(t(MOON_QUARTER_LABELS[quarter]));
  if (label.startsWith(want)) return true;
  // From a later word only when it names the phase: "full moon", not "the" or "moon", which every moon week has.
  const words = label.split(" ");
  return words.some((word, i) => i > 0 && !MOON_FILLER.has(word) && words.slice(i).join(" ").startsWith(want));
}

/** Words the moon weeks share, in English and Polish, which say nothing about the phase. */
const MOON_FILLER = new Set(["near", "the", "moon", "około", "księżyc"].map(normalize));

/** Other words for a moon week than its label: the phase itself, as "full moon" and "pełnia" read elsewhere in the app. */
const MOON_WORDS: Partial<Record<MoonQuarter, string[]>> = {
  full: ["full moon", "pełnia"],
  new: ["new moon", "nów"],
};

/** What an exact term compares for one fish, in the book's English: its kind, lure, water, sky, wind, time of day, season or moon. */
function exactName(book: Logbook, entry: CatchEntry, field: ExactField): string | null {
  if (field === "species") return entry.species;
  if (field === "lure") return entry.lure;
  if (field === "water") return spotById(book, entry.spotId)?.name ?? null;
  if (field === "sky") return entry.weather ? SKY_LABELS[entry.weather.sky] : null;
  if (field === "wind") return entry.weather ? WIND_LABELS[entry.weather.wind] : null;
  const at = new Date(entry.caughtAt);
  if (Number.isNaN(at.getTime())) return null;
  if (field === "season") return SEASON_LABELS[lakeSeason(at)];
  if (field === "moon") return MOON_QUARTER_LABELS[moonQuarterOf(at)];
  const id = biteTimeOf(at.getHours());
  return BITE_TIMES.find((row) => row.id === id)!.label;
}

/** The shared search, plus species and lure names as they read in the player's language, the month a fish came in, the kind of water, the sky, the wind, the season, the time of day, the moon, the outing's title, words from a note (the fish's, its outing's or its water's), and released or kept fish. */
function findOne(book: Logbook, needle: string, t: (text: string) => string, pictured: (id: string) => boolean): CatchEntry[] {
  // ">2 lb", "<30 cm": the fish on that side of a size.
  const exact = parseExactTerm(needle);
  if (exact) {
    // One name whole, as stored or as it reads in the player's language.
    const want = normalize(exact.name);
    const named = (name: string) => normalize(name) === want || normalize(t(name)) === want;
    return catchesNewestFirst(book).filter((entry) => {
      const name = exactName(book, entry, exact.field);
      return name !== null && named(name);
    });
  }
  // "2026-10-12": the fish of that local day.
  // "yesterday", "last week", "Oct 15", "sobota": the fish of those local days.
  const days = dateWords(needle);
  if (days) return catchesNewestFirst(book).filter((entry) => {
    const day = localDate(new Date(entry.caughtAt));
    return day >= days.from && day <= days.to;
  });
  if (/^\d{4}-\d{2}-\d{2}$/.test(needle.trim())) return catchesNewestFirst(book).filter((entry) => localDate(new Date(entry.caughtAt)) === needle.trim());
  // "2026-10": the fish of that local month, and only those, which the month bars and tiles open.
  if (/^\d{4}-\d{2}$/.test(needle.trim())) return catchesNewestFirst(book).filter((entry) => catchMonth(entry) === needle.trim());
  // ">60°F", "<15°C": the fish from water on that side of a temperature.
  const temp = parseTempQuery(needle);
  if (temp) return catchesNewestFirst(book).filter((entry) => tempMatches(entry.weather?.waterTempF, temp));
  const size = parseSizeQuery(needle);
  if (size) return catchesNewestFirst(book).filter((entry) => measuresOf(entry).some((measure) => sizeMatches(measure, size)));
  const found = searchCatches(book, needle);
  const translated = getLang() !== "en";
  const want = normalize(needle);
  // "released" or "kept" whole: just the fish put back, or just the ones taken home, not every note with the word.
  if (want === normalize(t("Released"))) return catchesNewestFirst(book).filter((entry) => entry.released);
  if (want === normalize(t("Kept"))) return catchesNewestFirst(book).filter((entry) => !entry.released);
  // "photo" whole: the fish with a picture kept, in either language.
  if (["photo", "photos", normalize(t("Photo")), normalize(t("Photos"))].includes(want)) return catchesNewestFirst(book).filter((entry) => pictured(entry.id));
  const hit = new Set(found.map((entry) => entry.id));
  // "rel" or "released" finds the fish put back, under both of the words the book uses for them.
  // An outing's title ("Opening day") finds the fish filed on it, from three letters up.
  const tripsNamed = new Set(want.length < 3 ? [] : book.trips.filter((trip) => normalize(trip.title).includes(want)).map((trip) => trip.id));
  // Words from a fish's own note, its outing's note or its water's notes find it too, from three letters up.
  const tripsNoted = new Set(want.length < 3 ? [] : book.trips.filter((trip) => normalize(trip.note).includes(want)).map((trip) => trip.id));
  const spotsNoted = new Set(want.length < 3 ? [] : book.spots.filter((spot) => normalize(spot.notes).includes(want)).map((spot) => spot.id));
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
      spotsNoted.has(entry.spotId) ||
      (want.length >= 3 && normalize(noteText(entry.note)).includes(want))
    )
      hit.add(entry.id);
  }
  return catchesNewestFirst(book).filter((entry) => hit.has(entry.id));
}

/** Splits a search on "+", but not inside a name in the book that has a "+" of its own ("Pond + creek") or after a size ("30in+"). */
export function searchParts(book: Logbook, needle: string): string[] {
  const names = [...book.spots.map((spot) => spot.name), ...book.trips.map((trip) => trip.title), ...book.catches.flatMap((entry) => [entry.species, entry.lure])]
    .filter((name) => name.includes("+"))
    .sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  // "30in+" or "2 kg+", as anglers say a 30-plus pike: the same as ">30in", not a "+" joining parts.
  let text = needle.replace(/(^|\s)(\d+(?:[.,]\d+)?\s?(?:lbs?|oz|kg|g|in|cm|°?[cf]))\+(?=\s|$)/gi, "$1>$2");
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

/**
 * The terms of one part for the word-by-word fallback: a size or temperature bound kept whole (">5 lb", "< 3 lb 2 oz",
 * ">60°F"), and a date of a few words ("last week", "Oct 15"), every other word on its own. One- and two-letter words ("a", "na") match nearly every fish, so they are left out.
 */
export function searchTerms(part: string): string[] {
  const tokens = part.trim().split(/\s+/);
  const terms: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    // A date of a few words ("last week", "oct 15") stays one term.
    let dated = 0;
    for (let j = Math.min(tokens.length, i + 3); j > i + 1 && dated === 0; j--) if (dateWords(tokens.slice(i, j).join(" "))) dated = j;
    if (dated > 0) {
      terms.push(tokens.slice(i, dated).join(" "));
      i = dated - 1;
      continue;
    }
    if (/^[<>]/.test(tokens[i]!)) {
      // The longest run from here that reads as one bound.
      let end = 0;
      for (let j = Math.min(tokens.length, i + 5); j > i && end === 0; j--) {
        const bound = tokens.slice(i, j).join(" ");
        if (parseSizeQuery(bound) || parseTempQuery(bound)) end = j;
      }
      if (end > 0) {
        terms.push(tokens.slice(i, end).join(" "));
        i = end - 1;
        continue;
      }
    }
    if (tokens[i]!.length > 2) terms.push(tokens[i]!);
  }
  return terms;
}

/**
 * One part of a search; words that find nothing together ("cedar pike") are then each taken as a part, so the fish
 * every word finds come back, as "cedar + pike" would ("pike >5 lb" as "pike + >5 lb"). Exact terms are left whole.
 */
function findWords(book: Logbook, part: string, t: (text: string) => string, pictured: (id: string) => boolean): CatchEntry[] {
  const found = findOne(book, part, t, pictured);
  if (found.length > 0 || part.trim().split(/\s+/).length < 2 || /[:"“”„]/.test(part)) return found;
  const words = searchTerms(part);
  if (words.length < 2) return found;
  let matched = findOne(book, words[0]!, t, pictured);
  for (const word of words.slice(1)) {
    if (matched.length === 0) break;
    const hit = new Set(findOne(book, word, t, pictured).map((entry) => entry.id));
    matched = matched.filter((entry) => hit.has(entry.id));
  }
  return matched;
}

/** One search, or several joined with "+" ("Northern pike + Overcast"): then only the fish every part finds. */
/** `pictured` says which fish have a photo kept, for "photo"; left out, none do. */
export function findCatches(book: Logbook, needle: string, t: (text: string) => string, pictured: (id: string) => boolean = () => false): CatchEntry[] {
  const parts = searchParts(book, needle);
  // "pike +" while the second part is still being typed: just the first.
  if (parts.length < 2) return parts[0] ? findWords(book, parts[0], t, pictured) : [];
  let found = findWords(book, parts[0]!, t, pictured);
  for (const part of parts.slice(1)) {
    const hit = new Set(findWords(book, part, t, pictured).map((entry) => entry.id));
    found = found.filter((entry) => hit.has(entry.id));
  }
  return found;
}

export { FIND_PARAM, exactTerm, findLink, findWithLink } from "./findLinks";

export function CatchSearch() {
  const { book, photoFor } = useLogbook();
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
    if (!linked) {
      // The search left the address (Home in the menu, say), not by clearing the box: clear the box too.
      if (typed.current !== "") setQuery("");
      typed.current = null;
      return;
    }
    if (linked === typed.current || !at) return;
    setQuery(linked);
    // The phone's sticky bar would cover the search box, so stop below it.
    const bar = document.querySelector<HTMLElement>(".field-mobile-bar");
    const below = bar && getComputedStyle(bar).position === "sticky" ? bar.offsetHeight : 0;
    window.scrollTo({ top: at.getBoundingClientRect().top + window.scrollY - below - 12 });
    // A link followed from home itself stays on the same page, so the shell does not move focus: move it here, so
    // the keyboard carries on from the matches and a screen reader says where it landed.
    at.focus({ preventScroll: true });
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
  const found = useMemo(() => (settled ? findCatches(book, settled, t, (id) => photoFor(id) !== null) : []), [book, settled, t, lang, photoFor]);
  const largest = params.get(ORDER_PARAM) === "largest";
  const matches = useMemo(() => (largest ? largestFirst(found) : found), [found, largest]);
  const setLargest = (next: boolean) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next) out.set(ORDER_PARAM, "largest");
        else out.delete(ORDER_PARAM);
        return out;
      },
      { replace: true },
    );

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
              else {
                out.delete(FIND_PARAM);
                out.delete(ORDER_PARAM);
              }
              return out;
            },
            { replace: true },
          );
        }}
      />
      {/* Only the count is read out; the cards themselves are not a live region. It stays mounted, so each new count is heard. */}
      <div role="status" className={settled ? (matches.length === 0 ? "empty" : "search-count") : undefined}>
        {!settled ? null : matches.length > 1 ? (
          // Several matches: what they add up to, from the count to the largest among them.
          <FishSum catches={matches} />
        ) : (
          <p>{matches.length === 0 ? t("Nothing in the book matches that.") : t("Matches: {count}", { count: matches.length })}</p>
        )}
      </div>
      {settled ? (
        <>
          {matches.length === 0 ? (
            <p className="search-tip">{t("Try a species, a water, a lure, a month or season, a time of day such as “dawn”, a sky such as “overcast”, a wind such as “breezy”, a kind of water such as “river”, a size such as “>2 lb”, a water temperature such as “>60°F”, a word from a note, a day such as “2026-10-12”, “photo”, or “released” or “kept”. Join two with “+”.")}</p>
          ) : null}
          {matches.length > 0 ? (
            <p className="search-save">
              <button
                type="button"
                className="text-button"
                onClick={() => downloadFile(catchesCsv({ ...book, catches: matches }), "text/csv;charset=utf-8", datedName("stillwater-catches.csv"))}
              >
                {t("Download these as a spreadsheet")}
              </button>
            </p>
          ) : null}
          {matches.length > 0 ? (
            <CopySummary text={() => searchSummary(searchParts(book, settled), matches, (id) => spotById(book, id)?.name ?? null)} file="stillwater-search.txt" />
          ) : null}
          {matches.length > 1 ? (
            // "Which was my biggest pike at Cedar": the same matches, largest first.
            <p className="search-order" role="group" aria-label={t("Order of the matches")}>
              <button type="button" className="text-button" aria-pressed={!largest} onClick={() => setLargest(false)}>
                {t("Newest first")}
              </button>
              <button type="button" className="text-button" aria-pressed={largest} onClick={() => setLargest(true)}>
                {t("Largest first")}
              </button>
            </p>
          ) : null}
          {matches.length > 0 && (
            // Month headings only make sense newest first.
            <PagedCatches key={`${settled}:${largest}`} items={matches} monthOf={largest ? undefined : catchMonth} headLevel={2}>
              {(entry) => (
                <CatchCard
                  key={entry.id}
                  entry={entry}
                  spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                  tripTitle={entry.tripId ? (tripById(book, entry.tripId)?.title ?? null) : null}
                  list={largest ? undefined : `find:${settled}`}
                />
              )}
            </PagedCatches>
          )}
          {/* Every fish on one lure: the place to fix that lure's name across the book. */}
          {matches.length > 0 && parseExactTerm(settled)?.field === "lure" ? (
            <RenameKind key={matches[0]!.lure} field="lure" name={matches[0]!.lure} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
