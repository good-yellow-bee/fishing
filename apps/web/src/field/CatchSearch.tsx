import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { BITE_TIMES, MOON_QUARTER_LABELS, type MoonQuarter, SEASON_LABELS, SKY_LABELS, WATER_LABELS, WIND_LABELS, biteTimeOf, catchesNewestFirst, foldText, lakeSeason, localDate, measuresOf, moonQuarterOf, searchCatches, spotById, tripById, type CatchEntry, type Logbook, type Measure } from "@stillwater/shared";
import { pluralOf } from "./pluralWord";
import { getLang, getUnits, loadPolish, polishBook, tn, useLang, useT } from "../i18n";
import { CatchCard } from "./cards";
import { CopySummary } from "./CopySummary";
import { RenameKind } from "./RenameKind";
import { bookBadges } from "./catchBadge";
import { countedBook, countedFish } from "./milestones";
import { countedSearch } from "./countedSearch";
import { typicalSize } from "./sizeBands";
import { searchSummary } from "./summaries";
import { catchesCsv } from "./catchCsv";
import { datedName, downloadFile } from "./download";
import { FishSum } from "./FishSum";
import { PagedCatches } from "./PagedCatches";
import { bookFishDay, monthName } from "./tripMonths";
import { formatDay, noteText, outingNameById, toLocalInput } from "./format";
import { tripForFish } from "./suggestions";
import { useLogbook } from "./LogbookState";
import "./search.css";
import { FIND_PARAM, exactTerm, parseExactTerm, type ExactField } from "./findLinks";
import { readSizePlus } from "./sizePlus";
import { hasMovedInApp } from "./FieldShell";
import { focusPageHeading } from "./pageFocus";
import { parseSizeQuery, parseTempQuery, sizeMatches, tempMatches } from "./sizeQuery";
import { largestFirst } from "./largestFirst";
import { MatchOrder, ORDER_PARAM, useLargestOrder } from "./MatchOrder";
import { dateWords, monthWord } from "./dateWords";
import { isSampleCatch } from "./bookCopy";
import { offPlayLake } from "./playLake";
import { shownPieceKey } from "./gear/pieceKey";

/** A book name as the Polish UI shows it, or itself when Polish has no line for it. */
function inPolish(name: string): string {
  const line = polishBook()[name];
  return typeof line === "string" ? line : name;
}

/** In the address beside the search, so Back from a fish keeps the order: "largest", or left out for newest first. */

/** Labels and words come round once per fish in a search: each is folded once, not 2,500 times. Notes are not kept. */
const foldedLabels = new Map<string, string>();
function normalize(text: string): string {
  const known = foldedLabels.get(text);
  if (known !== undefined) return known;
  const folded = foldText(text);
  if (text.length <= 60) foldedLabels.set(text, folded);
  return folded;
}

/** What a fish's time says, worked out once per fish: the date sums and the moon are the slow part of a search. */
type WhenOf = { season: ReturnType<typeof lakeSeason>; bite: (typeof BITE_TIMES)[number]["id"]; moon: MoonQuarter } | null;
const whenCache = new WeakMap<CatchEntry, WhenOf>();
function whenOf(entry: CatchEntry): WhenOf {
  if (whenCache.has(entry)) return whenCache.get(entry)!;
  const at = new Date(entry.caughtAt);
  const when = Number.isNaN(at.getTime()) ? null : { season: lakeSeason(at), bite: biteTimeOf(at.getHours()), moon: moonQuarterOf(at) };
  whenCache.set(entry, when);
  return when;
}

/** A fish's month as the book counts it ("2025-12"), its outing's day for a night fish; worked out once per fish. */
const monthCache = new WeakMap<Logbook, WeakMap<CatchEntry, string>>();
function fishMonth(book: Logbook, entry: CatchEntry): string {
  let months = monthCache.get(book);
  if (!months) monthCache.set(book, (months = new WeakMap()));
  let month = months.get(entry);
  if (month === undefined) months.set(entry, (month = bookFishDay(book, entry).slice(0, 7)));
  return month;
}

/** True when the fish's month's own name ("October", "Październik", "w październiku") starts with what was typed. */
function monthHas(book: Logbook, entry: CatchEntry, want: string): boolean {
  // A year is no month: "2027" typed in January would otherwise find last New Year's Eve's small-hours fish.
  if (want.length < 3 || /^\d+$/.test(want)) return false;
  const month = fishMonth(book, entry);
  const name = normalize(monthName(month));
  // The month and year whole ("October 2026"), or any form of the month's name: "października", "w październiku".
  return name.startsWith(want) || name.split(" ")[0]!.startsWith(want) || monthWord(want) === Number(month.slice(5)) - 1;
}

/**
 * A run of clock hours typed as "5-8am", "5am-8am", "05:00-08:00", "godz. 5-8" or "w godz. 5–8", or null. A bare "5-8"
 * says nothing about hours, so it needs the "am"/"pm", the ":00" or the "godz.".
 */
export function hourRange(text: string): { from: number; to: number } | null {
  const match = /^(?:(?:w\s+)?godz\.?\s*)?(\d{1,2})(:00)?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(:00)?\s*(am|pm)?$/i.exec(text.trim());
  if (!match) return null;
  const [, a, aColon, aHalf, b, bColon, bHalf] = match;
  if (!/godz/i.test(text) && !aColon && !bColon && !aHalf && !bHalf) return null;
  const hour = (typed: string, half: string | undefined) => {
    const n = Number(typed);
    if (!half) return n;
    return (n % 12) + (half.toLowerCase() === "pm" ? 12 : 0);
  };
  // "5-8pm" is 17 to 20: a half typed once goes with both ends.
  const from = hour(a!, aHalf ?? bHalf);
  const to = hour(b!, bHalf ?? aHalf);
  if (from > 23 || to > 24 || from === to) return null;
  return { from, to: to % 24 };
}

/** True when what was typed is a plural of a word of the fish's kind, in the book's name or the one shown: "szczupaki", "bluegills". */
function speciesPlural(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 4 || want.includes(" ")) return false;
  return [entry.species, t(entry.species)].some((name) => normalize(name).split(" ").some((word) => pluralOf(want, word)));
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
/** Other words for the seasons: "autumn", and the Polish "in summer" forms ("latem"). */
const SEASON_WORDS: Record<string, string[]> = { spring: ["wiosną", "wiosnę"], summer: ["latem", "lecie"], fall: ["autumn", "jesienią", "jesieni"], winter: ["zimą", "zimie"] };

function seasonHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const season = whenOf(entry)?.season;
  if (!season) return false;
  return [t(SEASON_LABELS[season]), ...(SEASON_WORDS[season] ?? [])].some((word) => normalize(word).startsWith(want));
}

/** "record", "pb": the book's biggest fish and the biggest of each kind, as their badges mark them. */
const RECORD_WORDS = new Set(["record", "records", "pb", "pbs", "rekord", "rekordy"].map((word) => normalize(word)));
/** "first": the first fish of each kind in the book. */
const FIRST_WORDS = new Set(["first", "firsts", "pierwsza", "pierwsze", "pierwszy"].map((word) => normalize(word)));
/** "big": the fish bigger than their kind's typical size, by the measure each was logged with. */
const BIG_WORDS = new Set(["big", "bigger", "duże", "duża", "duży", "duze", "duza", "duzy"].map((word) => normalize(word)));
/** "weighed" and "measured": the fish logged with a weight, or with a length, to see which still lack the other. */
const WEIGHED_WORDS = new Set(["weighed", "zważone", "zważona", "zważony", "zwazone", "zwazona", "zwazony"].map((word) => normalize(word)));
const MEASURED_WORDS = new Set(["measured", "zmierzone", "zmierzona", "zmierzony"].map((word) => normalize(word)));
/** "loose": fish left off an outing that water had that day, the ones "Add this fish to it" would file. */
export const LOOSE_WORDS = new Set(["loose", "unfiled", "luźne", "luzne"].map((word) => normalize(word)));
/** Fish on no outing at all, as the Polish help offers them. */
const NO_OUTING_WORDS = new Set(["no outing", "bez wyprawy"].map((word) => normalize(word)));
/** "sample": the sample week's fish, so a link can leave them out where the count beside it does (countedSearch). */
export const SAMPLE_WORDS = new Set(["sample", "przykładowe", "przykladowe"].map((word) => normalize(word)));
/** "game": the fish landed in the game, on its lake, as the outing search and the calendar's links say "-game". */
export const GAME_WORDS = new Set(["game", "gra"].map((word) => normalize(word)));
/** Words for Saturdays and Sundays, in English and Polish. */
const WEEKEND_WORDS = new Set(["weekend", "weekends", "weekendy"].map((word) => normalize(word)));

/** Other words anglers use for a part of the day, in English and Polish: "dusk" is the evening, "świt" the dawn. */
const TIME_WORDS: Partial<Record<(typeof BITE_TIMES)[number]["id"], string[]>> = {
  // Not "wschód" or "zachód": they are the east and west of a wind as well ("ze wschodu").
  // The Polish "at dawn", "in the evening" and "at night" forms too ("o świcie", "wieczorem", "nocą", "w nocy").
  dawn: ["sunrise", "first light", "daybreak", "świt", "świcie", "brzask"],
  morning: ["rankiem"],
  midday: ["noon", "południe"],
  afternoon: ["popołudniu"],
  evening: ["dusk", "sunset", "zmierzch", "zmrok", "wieczorem"],
  night: ["dark", "noc", "nocą", "nocy"],
};

const RECENT_KEY = "stillwater.recent-searches.v1";

/** The last three searches that found something, newest first; none where the browser keeps nothing. */
function readRecent(): string[] {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(kept) ? kept.filter((text): text is string => typeof text === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}

/** Puts a search first among the recent ones, once however it was spelled, and keeps three. */
export function keepRecent(text: string): string[] {
  const next = [text, ...readRecent().filter((other) => normalize(other) !== normalize(text))].slice(0, 3);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // A private window keeps nothing: the list just isn't offered next time.
  }
  return next;
}

/** True when what was typed starts a word for a part of the day ("night", "dusk", "wieczorem"), from three letters up: the outing search asks the fish then. */
export function isTimeWord(want: string, t: (text: string) => string): boolean {
  const typed = normalize(want);
  if (typed.length < 3) return false;
  return BITE_TIMES.some((band) => [band.label, t(band.label), ...(TIME_WORDS[band.id] ?? [])].some((word) => normalize(word).startsWith(typed)));
}

/** The part of the day a whole search names ("night", "at dusk", "o świcie", "wieczór"), in either language, or null. */
function wholeTimeWord(want: string, t: (text: string) => string): (typeof BITE_TIMES)[number]["id"] | null {
  const word = want.replace(/^(?:at|in the|during the|o|w|we|po) /, "");
  return BITE_TIMES.find((band) => [band.label, t(band.label), inPolish(band.label), ...(TIME_WORDS[band.id] ?? [])].some((name) => normalize(name) === word))?.id ?? null;
}

/** Whether `want` starts a word of `text`, or runs on from one ("przy lili" in "przy liliach"). */
function wordStarts(text: string, want: string): boolean {
  let at = text.indexOf(want);
  while (at >= 0) {
    if (at === 0 || !/[\p{L}\p{N}]/u.test(text[at - 1]!)) return true;
    at = text.indexOf(want, at + 1);
  }
  return false;
}

/** True when the part of the day the fish came at ("Dawn", "Wieczór", or a word for it such as "dusk") starts with what was typed, from three letters up. */
function timeHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const id = whenOf(entry)?.bite;
  if (!id) return false;
  const band = BITE_TIMES.find((row) => row.id === id)!;
  return [t(band.label), ...(TIME_WORDS[id] ?? [])].some((word) => normalize(word).startsWith(want));
}

/** True when the week of the moon the fish came in ("Waxing moon", "Near the full moon") has a word starting what was typed ("full moon"), from three letters up. */
function moonHas(entry: CatchEntry, want: string, t: (text: string) => string): boolean {
  if (want.length < 3) return false;
  const quarter = whenOf(entry)?.moon;
  if (!quarter) return false;
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

/** The month (1 to 12) a whole month name means, in English or Polish ("May", "maj", "Październik"), or null. */
function monthOfYear(name: string): number | null {
  const want = normalize(name);
  for (let month = 1; month <= 12; month++) {
    const at = new Date(2026, month - 1, 15);
    for (const lang of ["en", "pl"]) if (normalize(new Intl.DateTimeFormat(lang, { month: "long" }).format(at)) === want) return month;
  }
  return null;
}

/** What an exact term compares for one fish, in the book's English: its kind, lure, water, sky, wind, time of day, season or moon. */
function exactName(book: Logbook, entry: CatchEntry, field: ExactField): string | null {
  if (field === "species") return entry.species;
  if (field === "lure") return entry.lure;
  if (field === "water") return spotById(book, entry.spotId)?.name ?? null;
  if (field === "sky") return entry.weather ? SKY_LABELS[entry.weather.sky] : null;
  if (field === "wind") return entry.weather ? WIND_LABELS[entry.weather.wind] : null;
  if (field === "outing") {
    // "2026-10-10 Dawn patrol": one outing's fish, after midnight too, which a water and a day would miss.
    const trip = entry.tripId ? tripById(book, entry.tripId) : undefined;
    return trip ? `${trip.date} ${trip.title}` : null;
  }
  const at = new Date(entry.caughtAt);
  if (Number.isNaN(at.getTime())) return null;
  if (field === "season") return SEASON_LABELS[lakeSeason(at)];
  if (field === "moon") return MOON_QUARTER_LABELS[moonQuarterOf(at)];
  if (field === "month") return null;
  const id = biteTimeOf(at.getHours());
  return BITE_TIMES.find((row) => row.id === id)!.label;
}

/** The shared search, plus species and lure names as they read in the player's language, the month a fish came in, the kind of water, the sky, the wind, the season, the time of day, the moon, the outing's title, words from a note (the fish's, its outing's or its water's), and released or kept fish. */
function findOne(book: Logbook, needle: string, t: (text: string) => string, pictured: (id: string) => boolean): CatchEntry[] {
  // ">2 lb", "<30 cm": the fish on that side of a size.
  const exact = parseExactTerm(needle);
  if (exact?.field === "month") {
    // A month of any year ("May", "Maj"), by the month itself, so a note that "may" have said something doesn't count.
    const month = monthOfYear(exact.name);
    return month === null ? [] : catchesNewestFirst(book).filter((entry) => Number(fishMonth(book, entry).slice(5)) === month);
  }
  if (exact) {
    // One name whole, as stored or as it reads in the player's language, or in Polish: a link made in Polish still
    // opens its fish after a switch to English.
    const want = normalize(exact.name);
    // A lure goes by the piece Gear counts it as, so "Spinnerbait" opens the "Spinnerbaits" its record counted too.
    const piece = exact.field === "lure" ? shownPieceKey(exact.name) : null;
    const named = (name: string) =>
      normalize(name) === want || normalize(t(name)) === want || normalize(inPolish(name)) === want || (piece !== null && shownPieceKey(name) === piece);
    return catchesNewestFirst(book).filter((entry) => {
      const name = exactName(book, entry, exact.field);
      return name !== null && named(name);
    });
  }
  // "2026-10-12": the fish of that local day.
  // "yesterday", "last week", "Oct 15", "sobota": the fish of those days.
  const days = dateWords(needle);
  if (days) return catchesNewestFirst(book).filter((entry) => {
    // As the calendar counts it: a night session's small hours on its outing's day.
    const day = bookFishDay(book, entry);
    return day >= days.from && day <= days.to;
  });
  if (BIG_WORDS.has(normalize(needle))) {
    const byKind = new Map<string, CatchEntry[]>();
    // The usual size from the angler's own fish: game pike would move it.
    for (const entry of countedFish(book.catches)) {
      const kind = entry.species.trim().toLowerCase();
      byKind.set(kind, [...(byKind.get(kind) ?? []), entry]);
    }
    const amount = (measure: Measure) => (measure.kind === "length" ? measure.inches : measure.pounds);
    return catchesNewestFirst(book).filter((entry) => {
      const typical = typicalSize(byKind.get(entry.species.trim().toLowerCase()) ?? [], entry.measure.kind);
      return typical !== null && amount(entry.measure) > amount(typical);
    });
  }
  if (FIRST_WORDS.has(normalize(needle))) {
    const first = new Map<string, CatchEntry>();
    for (const entry of countedFish(book.catches)) {
      const kind = entry.species.trim().toLowerCase();
      const held = first.get(kind);
      if (!held || entry.caughtAt < held.caughtAt) first.set(kind, entry);
    }
    const ids = new Set([...first.values()].map((entry) => entry.id));
    return catchesNewestFirst(book).filter((entry) => ids.has(entry.id));
  }
  if (WEIGHED_WORDS.has(normalize(needle))) return catchesNewestFirst(book).filter((entry) => measuresOf(entry).some((measure) => measure.kind === "weight"));
  if (MEASURED_WORDS.has(normalize(needle))) return catchesNewestFirst(book).filter((entry) => measuresOf(entry).some((measure) => measure.kind === "length"));
  // "bez wyprawy": every fish on no outing in the book, filed or not filable.
  if (NO_OUTING_WORDS.has(normalize(needle))) {
    const trips = new Set(book.trips.map((trip) => trip.id));
    return catchesNewestFirst(book).filter((entry) => !entry.tripId || !trips.has(entry.tripId));
  }
  if (SAMPLE_WORDS.has(normalize(needle))) return catchesNewestFirst(book).filter((entry) => isSampleCatch(entry.id));
  if (GAME_WORDS.has(normalize(needle))) return catchesNewestFirst(book).filter((entry) => !offPlayLake(entry));
  if (LOOSE_WORDS.has(normalize(needle))) {
    const loose = looseOutings(book);
    return catchesNewestFirst(book).filter((entry) => loose.has(entry.id));
  }
  if (RECORD_WORDS.has(normalize(needle))) {
    const badges = bookBadges(book);
    return catchesNewestFirst(book).filter((entry) => badges.has(entry.id));
  }
  // "weekend": every fish caught on a Saturday or a Sunday.
  // By the day it counts on: a night session's small hours stay on its outing's day, as the day searches take them.
  if (WEEKEND_WORDS.has(normalize(needle))) return catchesNewestFirst(book).filter((entry) => [0, 6].includes(new Date(`${bookFishDay(book, entry)}T12:00:00`).getDay()));
  // A day's fish as the calendar counts them: a night session's small hours on its outing's day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(needle.trim())) return catchesNewestFirst(book).filter((entry) => bookFishDay(book, entry) === needle.trim());
  // "2026": the fish of that year by the day they count on, not every note or title with the number in it.
  // A number the book has no fish in (a lure's "1100", a note's "1500 m") is searched as text instead.
  if (/^\d{4}$/.test(needle.trim())) {
    const inYear = catchesNewestFirst(book).filter((entry) => bookFishDay(book, entry).startsWith(`${needle.trim()}-`));
    if (inYear.length > 0) return inYear;
  }
  // "2026-10": the fish of that month by the day they count on, and only those, which the month bars and tiles open.
  if (/^\d{4}-\d{2}$/.test(needle.trim())) return catchesNewestFirst(book).filter((entry) => bookFishDay(book, entry).slice(0, 7) === needle.trim());
  // "5-8am", "05:00-08:00", "godz. 5-8": the fish landed in those clock hours, the last one not included; "22-2" runs past midnight.
  const hours = hourRange(needle);
  if (hours) return catchesNewestFirst(book).filter((entry) => {
    const hour = new Date(entry.caughtAt).getHours();
    return hours.from <= hours.to ? hour >= hours.from && hour < hours.to : hour >= hours.from || hour < hours.to;
  });
  // ">60°F", "<15°C": the fish from water on that side of a temperature.
  const temp = parseTempQuery(needle);
  if (temp) return catchesNewestFirst(book).filter((entry) => tempMatches(entry.weather?.waterTempF, temp));
  const size = parseSizeQuery(needle);
  if (size) return catchesNewestFirst(book).filter((entry) => measuresOf(entry).some((measure) => sizeMatches(measure, size)));
  const found = searchCatches(book, needle);
  const translated = getLang() !== "en";
  const want = normalize(needle);
  // "released" or "kept" whole: just the fish put back, or just the ones taken home, not every note with the word.
  if (want === normalize(t("Released")) || want === normalize(inPolish("Released"))) return catchesNewestFirst(book).filter((entry) => entry.released);
  if (want === normalize(t("Kept")) || ["zabrane", "zabrany"].includes(want)) return catchesNewestFirst(book).filter((entry) => !entry.released);
  // "photo" whole: the fish with a picture kept, in either language.
  if (["photo", "photos", normalize(t("Photo")), normalize(t("Photos"))].includes(want)) return catchesNewestFirst(book).filter((entry) => pictured(entry.id));
  // "night", "w nocy", "rain" whole: just the fish then or in it, not a Nightcrawler at noon or a Rainbow trout.
  const band = wholeTimeWord(want, t);
  if (band) return catchesNewestFirst(book).filter((entry) => whenOf(entry)?.bite === band);
  const sky = (Object.keys(SKY_LABELS) as (keyof typeof SKY_LABELS)[]).find((key) => [SKY_LABELS[key], t(SKY_LABELS[key]), inPolish(SKY_LABELS[key])].some((word) => normalize(word) === want));
  if (sky) return catchesNewestFirst(book).filter((entry) => entry.weather?.sky === sky);
  const hit = new Set(found.map((entry) => entry.id));
  // "rel" or "released" finds the fish put back, under both of the words the book uses for them.
  // An outing's title ("Opening day") finds the fish filed on it, from three letters up.
  const tripsNamed = new Set(want.length < 3 ? [] : book.trips.filter((trip) => normalize(trip.title).includes(want)).map((trip) => trip.id));
  // Words from a fish's own note, its outing's note or its water's notes find it too, from three letters up.
  // From the start of a word: "noc" is not in "Północny brzeg", but "lilie" is in "przy liliach" and "rain" in "rain gear".
  const tripsNoted = new Set(want.length < 3 ? [] : book.trips.filter((trip) => wordStarts(normalize(trip.note), want)).map((trip) => trip.id));
  const spotsNoted = new Set(want.length < 3 ? [] : book.spots.filter((spot) => wordStarts(normalize(spot.notes), want)).map((spot) => spot.id));
  const releasedWords = want.length < 3 ? [] : [t("Released"), t("Released: {count} of {total}").split(":")[0]!].map(normalize);
  for (const entry of book.catches) {
    if (hit.has(entry.id)) continue;
    if (translated && (normalize(t(entry.species)).includes(want) || normalize(t(entry.lure)).includes(want))) hit.add(entry.id);
    else if (
      speciesPlural(entry, want, t) ||
      monthHas(book, entry, want) ||
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
      (want.length >= 3 && wordStarts(normalize(noteText(entry.note)), want))
    )
      hit.add(entry.id);
  }
  return catchesNewestFirst(book).filter((entry) => hit.has(entry.id));
}

/** A `field:"name"` term: its name is the book's own words, sizes, dashes and "+" included ("Kopyto 8 cm", "Mille Lacs - north"). */
// It ends at a quote with nothing, a "+" or a " -" after it, so an inch mark inside a lure's name ('4" Senko - green') stays in.
const QUOTED_TERM = /[a-z]+:".*?"(?=\s*(?:\+|\s-(?!\d)|$))|[a-z]+:"[^"]*"/gi;

/** Each quoted term set aside behind a mark, so nothing reads inside it; `back` puts them in again. */
function holdQuoted(text: string): { text: string; back: (part: string) => string } {
  const held: string[] = [];
  return {
    text: text.replace(QUOTED_TERM, (term) => `\u0001${held.push(term) - 1}\u0001`),
    back: (part) => part.replace(/\u0001(\d+)\u0001/g, (_, index: string) => held[Number(index)]!),
  };
}

/** Splits a search on "+", but not inside a name in the book that has a "+" of its own ("Pond + creek") or after a size ("30in+"). */
export function searchParts(book: Logbook, needle: string): string[] {
  const quoted = holdQuoted(needle);
  needle = quoted.text;
  const bookNames = [...book.spots.map((spot) => spot.name), ...book.trips.map((trip) => trip.title), ...book.catches.flatMap((entry) => [entry.species, entry.lure])];
  const names = bookNames.filter((name) => name.includes("+")).sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  // A name with a size in it ("Kopyto 8 cm", "Wahadłówka 10 g") is the name, not a size to find: set aside before the
  // sizes are read, as a quoted name is.
  const sizedNames = [...new Set(bookNames.filter((name) => /\d\s?(?:lbs?|oz|kg|dag|dkg|g|in|cm|mm)\b/i.test(name)))].sort((a, b) => b.length - a.length);
  for (const name of sizedNames) {
    const at = needle.toLowerCase().indexOf(name.toLowerCase());
    if (at < 0) continue;
    kept.push(needle.slice(at, at + name.length));
    needle = `${needle.slice(0, at)}\u0000${kept.length - 1}\u0000${needle.slice(at + name.length)}`;
  }
  // "over 10 in", "under 2 lb", "ponad 60 cm": the words for a bound, read as ">" and "<" before a size or temperature.
  const sized = String.raw`(?=\d+(?:[.,]\d+)?\s?(?:lbs?|oz|kg|dag|g|in|cm|mm|°?[cf])(?=[\s+]|$))`;
  // "10 inches" or "10 inch": the unit as the search reads it.
  const unit = String.raw`(?:lbs?|oz|kg|dag|g|in|cm|mm|°?[cf])`;
  let text = needle
    .replace(/(\d)\s?inch(?:es)?(?=[\s+]|$)/gi, "$1 in")
    // "20 dkg": the Polish shorthand for decagrams.
    .replace(/(\d)\s?dkg(?=[\s+]|$)/gi, "$1 dag")
    // "od 20 do 25 cm", "between 20 and 25 in", "from 2 to 3 lb", "50 to 60 cm", "50 cm do 60 cm": the range "20-25 cm", read below.
    .replace(new RegExp(String.raw`(^|[\s+])between\s+(\d+(?:[.,]\d+)?)(?:\s?${unit})?\s+and\s+(\d+(?:[.,]\d+)?\s?${unit})(?=[\s+]|$)`, "gi"), "$1$2-$3")
    .replace(new RegExp(String.raw`(^|[\s+])(?:(?:od|from)\s+)?(\d+(?:[.,]\d+)?)(?:\s?${unit})?\s+(?:do|to)\s+(\d+(?:[.,]\d+)?\s?${unit})(?=[\s+]|$)`, "gi"), "$1$2-$3")
    // "50 cm - 60 cm": the same, the unit typed twice.
    .replace(new RegExp(String.raw`(^|[\s+])(\d+(?:[.,]\d+)?)\s?${unit}\s?[-–]\s?(\d+(?:[.,]\d+)?\s?${unit})(?=[\s+]|$)`, "gi"), "$1$2-$3")
    .replace(new RegExp(String.raw`(^|[\s+])(?:over|above|at least|more than|bigger than|longer than|heavier than|warmer than|co najmniej|minimum|min\.?|ponad|powyżej|powyzej|więcej niż|wiecej niz|(?:większ|wieksz|dłuższ|dluzsz|cięższ|ciezsz|cieplejsz)[eya] niż|(?:większ|wieksz|dłuższ|dluzsz|cięższ|ciezsz|cieplejsz)[eya] niz|od)\s+` + sized, "gi"), "$1>")
    // "do 25 cm", "up to 2 lb", "max. 2 kg": the bound itself included; "at least" and "min." read as "over", which includes it too.
    .replace(new RegExp(String.raw`(^|[\s+])(?:do|up to|at most|co najwyżej|co najwyzej|najwyżej|najwyzej|maksymalnie|maks\.?|maximum|max\.?)\s+` + sized, "gi"), "$1<=")
    .replace(new RegExp(String.raw`(^|[\s+])(?:under|below|less than|smaller than|shorter than|lighter than|colder than|poniżej|ponizej|mniej niż|mniej niz|(?:mniejsz|krótsz|krotsz|lżejsz|lzejsz|zimniejsz)[eya] niż|(?:mniejsz|krótsz|krotsz|lżejsz|lzejsz|zimniejsz)[eya] niz)\s+` + sized, "gi"), "$1<");
  // "30in+" or "20+ in", as anglers say a 30-plus pike: the same as ">30in", not a "+" joining parts.
  text = readSizePlus(text);
  // "25-30 in" or "1–2 kg": a size between the two, both ends included, as ">25 in + <=30 in"; "30-25 in" reads the same.
  text = text.replace(/(^|[\s+])(\d+(?:[.,]\d+)?)\s?[-–]\s?(\d+(?:[.,]\d+)?)\s?(lbs?|oz|kg|dag|g|in|cm|mm|°?[cf])(?=[\s+]|$)/gi, (_all, lead: string, a: string, b: string, unit: string) => {
    const [low, high] = Number(a.replace(",", ".")) <= Number(b.replace(",", ".")) ? [a, b] : [b, a];
    return `${lead}>${low} ${unit} + <=${high} ${unit}`;
  });
  // "3 lb 2 oz" alone, as a scale reads: the fish of that weight to the nearest ounce, half an ounce either way.
  text = text.replace(/(?<![<>]=?\s*)(^|[\s+])(\d+)\s?lbs?\s+(\d+(?:[.,]\d+)?)\s?oz(?=[\s+]|$)/gi, (_all, lead: string, lb: string, oz: string) => {
    const pounds = Number(lb) + Number(oz.replace(",", ".")) / 16;
    const edge = (n: number) => String(Math.round(n * 1000) / 1000);
    return `${lead}>${edge(pounds - 1 / 32)} lb + <${edge(pounds + 1 / 32)} lb`;
  });
  // "17 in" or "2.5 lb" alone: the fish of that size as it rounds, from half a step under it to half a step over.
  // Not part of "3 lb 2 oz", which reads as one weight, nor a bound with a space in it ("> 1 lb").
  text = text.replace(/(?<![<>]=?\s*)(^|[\s+])(?<!lbs?\s+)(\d+(?:[.,]\d+)?)\s?(lbs?|oz|kg|dag|g|in|cm|mm|°?[cf])(?![\s]+\d+(?:[.,]\d+)?\s?oz)(?=[\s+]|$)/gi, (_all, lead: string, typed: string, unit: string) => {
    const value = Number(typed.replace(",", "."));
    const half = 0.5 / 10 ** (typed.split(/[.,]/)[1]?.length ?? 0);
    const edge = (n: number) => String(Math.round(n * 1000) / 1000);
    return `${lead}>${edge(value - half)} ${unit} + <${edge(value + half)} ${unit}`;
  });
  for (const name of names) {
    const at = text.toLowerCase().indexOf(name.toLowerCase());
    if (at < 0) continue;
    kept.push(text.slice(at, at + name.length));
    text = `${text.slice(0, at)}\u0000${kept.length - 1}\u0000${text.slice(at + name.length)}`;
  }
  return text
    .split("+")
    .map((part) => quoted.back(part.replace(/\u0000(\d+)\u0000/g, (_, index: string) => kept[Number(index)]!)).trim())
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
    for (let j = Math.min(tokens.length, i + 5); j > i + 1 && dated === 0; j--) if (dateWords(tokens.slice(i, j).join(" "))) dated = j;
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
    // Short words are noise ("of", "na"), but "pb" is a word of its own.
    if (tokens[i]!.length > 2 || RECORD_WORDS.has(normalize(tokens[i]!))) terms.push(tokens[i]!);
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
  // "o świcie", "at night": the one word left once the short ones go.
  if (words.length === 1) return words[0] === part.trim() ? found : findOne(book, words[0]!, t, pictured);
  if (words.length < 2) return found;
  let matched = findOne(book, words[0]!, t, pictured);
  for (const word of words.slice(1)) {
    if (matched.length === 0) break;
    const hit = new Set(findOne(book, word, t, pictured).map((entry) => entry.id));
    matched = matched.filter((entry) => hit.has(entry.id));
  }
  return matched;
}

/**
 * What to leave out of a search: a part that starts with "-" ("pike + -released"), and what follows a "-" in a part
 * ("pike -released", "pike -soft plastic", "pike -water:"Cedar Lake"", "pike -released -jig"): to the next "-" or the
 * part's end. A "-" before a number ("-5°C") is kept as it is, unless the number is a year, month or day ("-2025"). Returns the parts to find and the ones to drop.
 */
export function splitLeftOut(parts: readonly string[]): { keep: string[]; drop: string[] } {
  const keep: string[] = [];
  const drop: string[] = [];
  // A "-" at the start, or after a space, that comes before a word, a size bound ("-<10 in") or a year, month or day
  // ("-2025", "-2025-12"), not a number ("-5°C").
  const dash = /(?:^|\s)-\s*(?=[^\s\d.,<>-]|[<>]=?\s?\d|\d{4}(?:-\d{2}){0,2}(?:\s|\+|$))/;
  for (const whole of parts) {
    // A dash inside a quoted name ("Rapala - silver") is part of the name.
    const quoted = holdQuoted(whole);
    const pieces = quoted.text.split(dash).map((piece) => quoted.back(piece).trim());
    if (pieces[0]) keep.push(pieces[0]);
    for (const piece of pieces.slice(1)) if (piece) drop.push(piece);
  }
  return { keep, drop };
}

/**
 * The parts to find and to leave out, with a name in the book that has a " - " of its own ("Rapala - silver",
 * "Mille Lacs - north") typed as it reads kept whole, not taken as leaving out what follows its dash.
 */
export function leftOutParts(book: Logbook, needle: string): { keep: string[]; drop: string[] } {
  const names = [...new Set([...book.spots.map((spot) => spot.name), ...book.trips.map((trip) => trip.title), ...book.catches.flatMap((entry) => [entry.species, entry.lure])])]
    .filter((name) => /\s-\s/.test(name))
    .sort((a, b) => b.length - a.length);
  const held: string[] = [];
  let text = needle;
  for (const name of names) {
    for (let at = text.toLowerCase().indexOf(name.toLowerCase()); at >= 0; at = text.toLowerCase().indexOf(name.toLowerCase())) {
      text = `${text.slice(0, at)}\u0002${held.push(text.slice(at, at + name.length)) - 1}\u0002${text.slice(at + name.length)}`;
    }
  }
  const back = (part: string) => part.replace(/\u0002(\d+)\u0002/g, (_, index: string) => held[Number(index)]!);
  const { keep, drop } = splitLeftOut(searchParts(book, text));
  return { keep: keep.map(back), drop: drop.map(back) };
}

/** One search, or several joined with "+" ("Northern pike + Overcast"): then only the fish every part finds. */
/** `pictured` says which fish have a photo kept, for "photo"; left out, none do. */
export function findCatches(book: Logbook, needle: string, t: (text: string) => string, pictured: (id: string) => boolean = () => false): CatchEntry[] {
  const { keep, drop } = leftOutParts(book, needle);
  if (drop.length === 0) return findKept(book, keep, t, pictured);
  // Only words to leave out ("-released"): every other fish in the book.
  let found = keep.length > 0 ? findKept(book, keep, t, pictured) : catchesNewestFirst(book);
  for (const part of drop) {
    const left = new Set(findWords(book, part, t, pictured).map((entry) => entry.id));
    found = found.filter((entry) => !left.has(entry.id));
  }
  return found;
}

function findKept(book: Logbook, parts: readonly string[], t: (text: string) => string, pictured: (id: string) => boolean): CatchEntry[] {
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

const looseCache = new WeakMap<Logbook, ReadonlyMap<string, string>>();

/** The fish left off an outing their water had that day, newest first, each with that outing's id; worked out once per book. */
export function looseOutings(book: Logbook): ReadonlyMap<string, string> {
  const known = looseCache.get(book);
  if (known) return known;
  const trips = new Set(book.trips.map((trip) => trip.id));
  const found = new Map<string, string>();
  for (const entry of catchesNewestFirst(book)) {
    if ((entry.tripId && trips.has(entry.tripId)) || Number.isNaN(Date.parse(entry.caughtAt))) continue;
    const trip = tripForFish(book, entry.spotId, toLocalInput(new Date(entry.caughtAt)));
    if (trip) found.set(entry.id, trip.id);
  }
  looseCache.set(book, found);
  return found;
}

/** "File these on their outings": after a "loose" search, every fish goes onto its day's outing in one tap. */
function FileLoose() {
  const { book, fileEach } = useLogbook();
  const t = useT();
  const loose = looseOutings(book);
  if (loose.size === 0) return null;
  return (
    <p className="file-loose">
      <button
        type="button"
        className="text-button"
        onClick={() => {
          // The button and the list go once they are filed: focus goes back to the search, not the top of the page.
          if (fileEach(loose)) setTimeout(() => document.getElementById("catch-search")?.focus(), 0);
        }}
      >
        {t("File these on their outings")}
      </button>
    </p>
  );
}

/** For a day typed as "2026-10-11": its after-midnight fish that count on the outing's day before, and that day. */
export function smallHoursOn(book: Logbook, needle: string, now = new Date()): { count: number; day: string; on: string } | null {
  // A day however the search reads one: "Oct 11", "11 października", or as typed off a photo's clock.
  const typed = needle.trim();
  const days = /^\d{4}-\d{2}-\d{2}$/.test(typed) ? { from: typed, to: typed } : dateWords(needle, now);
  if (!days || days.from !== days.to) return null;
  const day = days.from;
  const moved = book.catches.filter((entry) => localDate(new Date(entry.caughtAt)) === day && bookFishDay(book, entry) !== day);
  return moved.length > 0 ? { count: moved.length, day: bookFishDay(book, moved[0]!), on: day } : null;
}

/** Why nothing matched: a bare year with no fish in it says so, and where the book starts when it is before that. */
export function emptyText(book: Logbook, needle: string, t: ReturnType<typeof useT>): string {
  const year = needle.trim();
  if (!/^\d{4}$/.test(year) || book.catches.length === 0) return t("Nothing in the book matches that.");
  const first = book.catches.map((entry) => bookFishDay(book, entry).slice(0, 4)).reduce((a, b) => (b < a ? b : a));
  return year < first ? t("No fish in {year}. The book starts in {first}.", { year, first }) : t("No fish in {year}.", { year });
}

export function CatchSearch() {
  const { book, photoFor } = useLogbook();
  const t = useT();
  const lang = useLang();
  const [params, setParams] = useSearchParams();
  // The search lives in the address too, so Back from a catch returns to the same matches.
  const [query, setQuery] = useState(() => params.get(FIND_PARAM) ?? "");
  // Polish names match in any language, so an English reader's first search fetches the Polish book too.
  const searching = query.trim() !== "";
  useEffect(() => {
    if (searching) loadPolish().catch(() => {});
  }, [searching]);
  const box = useRef<HTMLElement>(null);
  const linked = params.get(FIND_PARAM) ?? "";
  // Everything typed here since the last link, so the address catching up with the box is not taken for a new link:
  // on a slow phone with a long book it can still be a few keys behind ("pi" arriving after "pik" was typed).
  const typed = useRef<Set<string>>(new Set());
  const popped = useRef(false);
  // Back or Forward, not a first visit to the address (which has no entry of the router's own to come back to).
  const how = useNavigationType();
  popped.current = how === "POP" && hasMovedInApp();
  // Any Back or Forward: once this search has shown a link, a Back from it is one, even on the visit's first page.
  const poppedHere = useRef(false);
  poppedHere.current = how === "POP";
  const shownLink = useRef(linked);
  useEffect(() => {
    // Arriving from a link with a search typed in, even one followed from home itself: show the matches, not the top of home.
    const at = box.current;
    const hadLink = shownLink.current;
    shownLink.current = linked;
    if (!linked) {
      // The search left the address (Home in the menu, say), not by clearing the box: clear the box too.
      if (!typed.current.has("")) setQuery("");
      // Back from a search link on the same page: the matches that held focus are gone, so focus and the view go to the
      // page's heading rather than falling to the document halfway down the page.
      const active = document.activeElement;
      if (hadLink && poppedHere.current && !typed.current.has("") && (!active || active === document.body || (at && at.contains(active)))) {
        focusPageHeading({ preventScroll: true });
        // After the browser has put back where the matches were scrolled (on a first page it can come a little late),
        // so the view shows what has focus.
        const toTop = () => window.scrollTo(0, 0);
        requestAnimationFrame(toTop);
        setTimeout(toTop, 150);
      }
      typed.current = new Set();
      return;
    }
    if (typed.current.has(linked) || !at) return;
    typed.current = new Set();
    setQuery(linked);
    // Back to a search: the browser puts the page back where it was, and focus is left alone as the shell leaves it.
    if (popped.current) return;
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
  const search = (next: string) => {
    typed.current.add(next);
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
  };
  const [recent, setRecent] = useState(readRecent);
  const needle = query.trim();
  // Typing stays quick in a long book: the results catch up a beat behind the keys.
  const settled = useDeferredValue(needle);
  // One lure found, whatever a count's link leaves out beside it (the game's lake, the sample week): its rename box shows.
  const kept = leftOutParts(book, settled).keep;
  const onlyLure = kept.length === 1 && parseExactTerm(kept[0]!)?.field === "lure";
  const metric = getUnits() === "metric";
  // The Polish book arrives a beat after the first search; matching runs again once it is in.
  const polish = polishBook();
  const found = useMemo(() => (settled ? findCatches(book, settled, t, (id) => photoFor(id) !== null) : []), [book, settled, t, lang, photoFor, polish]);
  const [largest, setLargest] = useLargestOrder();
  // The same search sits on Home and on Catches; a fish opened from it leads back to whichever it was.
  const onCatches = useLocation().pathname.startsWith("/catches");
  const matches = useMemo(() => (largest ? largestFirst(found) : found), [found, largest]);
  // A day searched whose fish all count on the night before: where they went.
  const nightDay = useMemo(() => smallHoursOn(book, settled), [book, settled]);
  // The angler's own among them, decided for the whole book as /catches decides it.
  // As Home and Bests count them: the sample week goes with the angler's first outing, even one only planned.
  const mine = useMemo(() => {
    const own = new Set(countedBook(book).catches.map((entry) => entry.id));
    return matches.filter((entry) => own.has(entry.id));
  }, [book, matches]);
  // Found only the sample week's or the game's fish, once those no longer count: said, so they aren't read as the angler's.
  const othersOnly = mine.length === 0 && matches.length > 0;

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
        placeholder={t("Species, water, lure, month")}
        autoComplete="off"
        onChange={(event) => search(event.target.value)}
        // Left with matches (a card tapped, or done), the search is kept among the last few.
        onBlur={() => {
          if (settled && matches.length > 0) setRecent(keepRecent(settled));
        }}
      />
      {/* The box empty: the last searches that found something, one tap to run again. */}
      {!needle && recent.length > 0 ? (
        <p className="search-tip recent-searches">
          {t("Recent:")}{" "}
          {recent.map((text, index) => (
            <Fragment key={text}>
              {index > 0 ? " · " : null}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  search(text);
                  // The button goes with the empty box: on to the box, where the new count is read.
                  input.current?.focus();
                }}
              >
                {text}
              </button>
            </Fragment>
          ))}
        </p>
      ) : null}
      {/* Only the count is read out; the cards themselves are not a live region. It stays mounted, so each new count is heard. */}
      <div role="status" className={settled ? (matches.length === 0 ? "empty" : "search-count") : undefined}>
        {!settled ? null : matches.length > 1 ? (
          // Several matches: what they add up to, from the count to the largest among them.
          <>
            {/* Summed as /catches sums the book: the angler's own, with the sample week's and the game's said apart. */}
            {/* A search that finds only those ("sample", "game") sums what it found. */}
            <FishSum catches={mine.length > 0 ? mine : matches} />
            <FishDays book={book} catches={mine.length > 0 ? mine : matches} />
            <TopLure catches={mine.length > 0 ? mine : matches} />
            {mine.length > 0 && mine.length < matches.length ? (
              <p className="meta">{tn(matches.length - mine.length, "Also listed: {n} fish from the sample week or the game.", "Also listed: {n} fish from the sample week or the game.")}</p>
            ) : othersOnly ? (
              <p className="meta">{t("These are all from the sample week or the game.")}</p>
            ) : null}
          </>
        ) : (
          <p>
            {matches.length === 0 && nightDay ? (
              // A day typed off a photo's clock: its small hours went to the evening before, as a night session's do.
              <>
                {t("Nothing on {day} itself: fish caught after midnight ({n}) count on their outing's day, {outingDay}.", { day: formatDay(nightDay.on), n: nightDay.count, outingDay: formatDay(nightDay.day) })}{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    search(nightDay.day);
                    input.current?.focus();
                  }}
                >
                  {t("Show {day}", { day: formatDay(nightDay.day) })}
                </button>
              </>
            ) : matches.length === 0 ? (
              emptyText(book, settled, t)
            ) : (
              t("Matches: {count}", { count: matches.length })
            )}
          </p>
        )}
      </div>
      {settled ? (
        <>
          {/* Split as the count above sums: the angler's own, when there are any. */}
          {matches.length > 1 ? <MatchSplits matches={mine.length > 0 ? mine : matches} all={matches} search={settled} largest={largest} /> : null}
          {(matches.length === 0 && /(^|[\s+])([<>]\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?[-–]\s?\d+(?:[.,]\d+)?)(?=[\s+]|$)/.test(settled)) || /(^|\s)\d+(?:[.,]\d+)?\+(?=\s*$|\s+\+|\s+(?!(?:lbs?|oz|kg|dag|g|in|cm|mm|°?[cf]|″|")(?:\s|$)))/i.test(settled) ? (
            // ">30" finds nothing without saying what it measures; "pike 30+" finds every pike, the number unread.
            <p className="search-tip">{t("Add a unit to a size, as in “{size}”.", { size: metric ? ">70 cm" : ">30 in" })}</p>
          ) : null}
          {matches.length === 0 && !nightDay ? (
            <p className="search-tip">
              {t("Try a species, a water, a lure, a month or season, a time of day such as “dawn”, a sky such as “overcast”, a wind such as “breezy”, a kind of water such as “river”, a size such as “{size}”, a water temperature such as “{temp}”, a word from a note, a day such as “2026-10-12” or “last weekend”, a year such as “2025”, “photo”, “record”, “first”, “big”, “loose”, “weighed” or “measured”, or “released” or “kept”. Join two with “+”.", { size: metric ? ">1 kg" : ">2 lb", temp: metric ? ">15°C" : ">60°F" })}{" "}
              {t("Put “-” before a word to leave those fish out.")}
            </p>
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
            <CopySummary text={() => searchSummary(searchParts(book, settled), matches, (id) => spotById(book, id)?.name ?? null, largest)} file="stillwater-search.txt" />
          ) : null}
          {matches.length > 1 ? (
            // "Which was my biggest pike at Cedar": the same matches, largest first.
            <MatchOrder largest={largest} onChange={setLargest} />
          ) : null}
          {matches.length > 0 && (
            // Month headings only make sense newest first.
            <PagedCatches key={`${settled}:${largest}`} items={matches} monthOf={largest ? undefined : (entry) => bookFishDay(book, entry).slice(0, 7)} headLevel={2}>
              {(entry) => (
                <CatchCard
                  key={entry.id}
                  entry={entry}
                  spotName={spotById(book, entry.spotId)?.name ?? t("Unknown water")}
                  tripTitle={entry.tripId ? outingNameById(book, entry.tripId) : null}
                  list={`${onCatches ? "catches" : "find"}${largest ? "-largest" : ""}:${settled}`}
                />
              )}
            </PagedCatches>
          )}
          {/* "bez wyprawy" takes in the loose fish too: those can still be filed in one tap. */}
          {matches.length > 0 && (LOOSE_WORDS.has(normalize(settled)) || NO_OUTING_WORDS.has(normalize(settled))) ? <FileLoose /> : null}
          {/* Every fish on one lure: the place to fix that lure's name across the book. */}
          {matches.length > 0 && onlyLure ? (
            <RenameKind key={matches[0]!.lure} field="lure" name={matches[0]!.lure} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/** The one value most of the found fish share, when at least two do and none ties it; null otherwise. */
function leader<T>(catches: readonly CatchEntry[], of: (entry: CatchEntry) => T | null): { value: T; count: number } | null {
  const counts = new Map<T, number>();
  for (const entry of catches) {
    const value = of(entry);
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const [top, next] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || top[1] < 2 || (next && next[1] === top[1]) || counts.size < 2) return null;
  return { value: top[0], count: top[1] };
}

/** What the found fish have in common, where one clearly leads: "Most on Jig (5). Most at Dawn (4). Most from Cedar Lake (6)." */
/**
 * The matches split by kind and by year, once they hold more than one: "By kind: Northern pike 3 · Zander 2", "By year:
 * 2026 5 · 2025 3". Each narrows the search to that kind or year.
 */
/**
 * `matches`: the fish counted (the angler's own among those found); `all`: everything found, so each narrowed search
 * leaves out the sample week's and the game's as the count did. The order shown goes with it.
 */
function MatchSplits({ matches, all, search, largest }: { matches: readonly CatchEntry[]; all: readonly CatchEntry[]; search: string; largest: boolean }) {
  const t = useT();
  const { book } = useLogbook();
  const { pathname } = useLocation();
  const narrow = (term: string, rows: readonly CatchEntry[]) =>
    `${pathname}?${new URLSearchParams({ [FIND_PARAM]: countedSearch(book, `${search} + ${term}`, rows, "book"), ...(largest ? { [ORDER_PARAM]: "largest" } : {}) }).toString()}`;
  const tally = (key: (entry: CatchEntry) => string) => {
    const counts = new Map<string, number>();
    for (const entry of matches) counts.set(key(entry), (counts.get(key(entry)) ?? 0) + 1);
    return [...counts];
  };
  const kinds = tally((entry) => entry.species).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const years = tally((entry) => bookFishDay(book, entry).slice(0, 4)).sort((a, b) => b[0].localeCompare(a[0]));
  const line = (label: string, rows: [string, number][], term: (value: string) => string, name: (value: string) => string, of: (entry: CatchEntry, value: string) => boolean) =>
    rows.length > 1 ? (
      <p className="meta match-split">
        {label}{" "}
        {rows.map(([value, count], index) => (
          <Fragment key={value}>
            {index > 0 ? " · " : null}
            <Link to={narrow(term(value), all.filter((entry) => of(entry, value)))} aria-label={`${name(value)}: ${tn(count, "{n} fish", "{n} fish")}`}>
              {`${name(value)} ${count}`}
            </Link>
          </Fragment>
        ))}
      </p>
    ) : null;
  return (
    <>
      {line(t("By kind:"), kinds, (species) => exactTerm("species", t(species)), (species) => t(species), (entry, species) => entry.species === species)}
      {line(t("By year:"), years, (year) => year, (year) => year, (entry, year) => bookFishDay(book, entry).startsWith(`${year}-`))}
    </>
  );
}

/** "3 days out · 2 outings": how many days and outings a search's fish came on, once that is more than one. */
export function fishDays(book: Logbook, catches: readonly CatchEntry[]): { days: number; outings: number } {
  const trips = new Set(book.trips.map((trip) => trip.id));
  return {
    // A night session's small hours count on its outing's day, as the calendar counts them.
    days: new Set(catches.map((entry) => bookFishDay(book, entry))).size,
    outings: new Set(catches.flatMap((entry) => (entry.tripId && trips.has(entry.tripId) ? [entry.tripId] : []))).size,
  };
}

function FishDays({ book, catches }: { book: Logbook; catches: readonly CatchEntry[] }) {
  const { days, outings } = fishDays(book, catches);
  if (days < 2 && outings < 2) return null;
  return (
    <p className="meta fish-days">
      {tn(days, "{n} day out", "{n} days out")}
      {outings > 0 ? `\u00a0· ${tn(outings, "{n} outing", "{n} outings")}` : ""}
    </p>
  );
}

function TopLure({ catches }: { catches: readonly CatchEntry[] }) {
  const t = useT();
  const { book } = useLogbook();
  const lure = leader(catches, (entry) => entry.lure.trim().replace(/\s+/g, " ").toLowerCase() || null);
  const time = leader(catches, (entry) => {
    const at = new Date(entry.caughtAt);
    return Number.isNaN(at.getTime()) ? null : biteTimeOf(at.getHours());
  });
  const water = leader(catches, (entry) => entry.spotId);
  const lureName = lure ? catches.find((entry) => entry.lure.trim().replace(/\s+/g, " ").toLowerCase() === lure.value)!.lure.trim() : "";
  const lines = [
    lure ? t("Most on {lure}.", { lure: `${t(lureName)} (${lure.count})` }) : null,
    time ? t("Most at {time}.", { time: `${t(BITE_TIMES.find((row) => row.id === time.value)!.label)} (${time.count})` }) : null,
    water ? t("Most from {water}.", { water: `${spotById(book, water.value)?.name ?? ""} (${water.count})` }) : null,
  ].filter(Boolean);
  return lines.length > 0 ? <p className="meta top-lure">{lines.join(" ")}</p> : null;
}

