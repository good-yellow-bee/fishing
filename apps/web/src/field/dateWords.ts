import { foldText, localDate } from "@stillwater/shared";

/** A run of local days, both ends included, as "YYYY-MM-DD". */
export type DayRange = { from: string; to: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayOf(base: Date, shift: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + shift);
}

function ymd(date: Date): string {
  return localDate(date);
}

/** Lower case, no dots, accents or doubled spaces: "Oct. 15" reads as "oct 15", "Środa" as "sroda". */
function plain(text: string): string {
  return foldText(text.replace(/\./g, ""));
}

/** Whether the typed words are one of these phrases, however they carry their accents. */
function says(want: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => plain(phrase) === want);
}

const LANGS = ["en", "pl"] as const;

/** Every name a month goes by in English and Polish: "october", "oct", "październik", "października", "paź". */
function monthNames(): string[][] {
  return Array.from({ length: 12 }, (_, month) => {
    const at = new Date(2026, month, 15);
    const names = new Set<string>();
    for (const lang of LANGS) {
      names.add(plain(new Intl.DateTimeFormat(lang, { month: "long" }).format(at)));
      names.add(plain(new Intl.DateTimeFormat(lang, { month: "short" }).format(at)));
      // The form a month takes beside a day: "15 października".
      names.add(plain(new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" }).format(at).replace(/\d+/g, "")));
    }
    // "w październiku": the form a month takes after "in", which no date format writes.
    names.add(IN_MONTH[month]!);
    return [...names].filter(Boolean);
  });
}

/** Polish months after "w": "w styczniu", "we wrześniu". */
const IN_MONTH = ["styczniu", "lutym", "marcu", "kwietniu", "maju", "czerwcu", "lipcu", "sierpniu", "wrzesniu", "pazdzierniku", "listopadzie", "grudniu"];

/** A weekday's whole name in English and Polish, Sunday first as Date.getDay counts them. */
function weekdayNames(): string[][] {
  return Array.from({ length: 7 }, (_, day) => {
    // 2026-10-11 was a Sunday.
    const at = new Date(2026, 9, 11 + day);
    const names = new Set<string>();
    for (const lang of LANGS) {
      // Whole names only: "sun" and "wed" already find sunny days and notes.
      const name = plain(new Intl.DateTimeFormat(lang, { weekday: "long" }).format(at));
      names.add(name);
      // "w sobotę", "w środę": the Polish days ending in "a" as they read after "w".
      if (lang === "pl" && name.endsWith("a")) names.add(`${name.slice(0, -1)}e`);
    }
    return [...names].filter(Boolean);
  });
}

let months: string[][] | null = null;
let weekdays: string[][] | null = null;

/** The month a word names, from its first three letters up ("oct", "paźdz"), or -1. */
function monthOf(word: string): number {
  months ??= monthNames();
  if (word.length < 3) return -1;
  return months.findIndex((names) => names.some((name) => name.startsWith(word)));
}

/**
 * The month (0-11) typed text names on its own, in any form it takes: "october", "paź", "października",
 * "w październiku", "we wrześniu"; -1 for anything else.
 */
export function monthWord(text: string): number {
  // Asked once per fish in a search: worked out once per word.
  const known = monthWords.get(text);
  if (known !== undefined) return known;
  const word = plain(text).replace(/^we? /, "");
  const month = word.includes(" ") ? -1 : monthOf(word);
  if (monthWords.size > 200) monthWords.clear();
  monthWords.set(text, month);
  return month;
}

const monthWords = new Map<string, number>();

/** Monday of the week a day falls in. */
function mondayOf(day: Date): Date {
  return dayOf(day, -((day.getDay() + 6) % 7));
}

/**
 * The local days a date word names, or null for anything else: "today", "yesterday", "this week", "last week",
 * "this month", "last month", a weekday by its whole name (its latest, today included), "Oct 15" or "15 października" (this year's, or
 * last year's while that day is still to come). English and Polish both. With `ahead` (outings, which can be planned),
 * "this week", "this month" and "this year" run to their ends, "this weekend" on a weekday is the coming one, "Oct 24"
 * is the nearest such day, and "tomorrow", "next week" and "next weekend" are read too.
 */
export function dateWords(text: string, now = new Date(), { ahead = false }: { ahead?: boolean } = {}): DayRange | null {
  const want = plain(text);
  if (!want) return null;
  const today = dayOf(now, 0);
  const one = (date: Date): DayRange => ({ from: ymd(date), to: ymd(date) });
  // Looking ahead (planned outings), "this week" and "this month" run to their ends, and the days to come have words.
  const upTo = (end: Date) => ymd(ahead ? end : today);
  if (says(want, ["today", "dziś", "dzisiaj"])) return one(today);
  if (says(want, ["yesterday", "wczoraj"])) return one(dayOf(today, -1));
  if (ahead && says(want, ["tomorrow", "jutro"])) return one(dayOf(today, 1));
  if (ahead && says(want, ["next week", "przyszły tydzień", "w przyszłym tygodniu"])) {
    const monday = mondayOf(today);
    return { from: ymd(dayOf(monday, 7)), to: ymd(dayOf(monday, 13)) };
  }
  if (ahead && says(want, ["next weekend", "przyszły weekend", "w przyszły weekend", "w przyszłym weekendzie"])) {
    const monday = mondayOf(today);
    return { from: ymd(dayOf(monday, 12)), to: ymd(dayOf(monday, 13)) };
  }
  if (says(want, ["this week", "ten tydzień", "w tym tygodniu"])) return { from: ymd(mondayOf(today)), to: upTo(dayOf(mondayOf(today), 6)) };
  if (says(want, ["last week", "zeszły tydzień", "w zeszłym tygodniu", "ostatni tydzień"])) {
    const monday = mondayOf(today);
    return { from: ymd(dayOf(monday, -7)), to: ymd(dayOf(monday, -1)) };
  }
  // A weekend by its Saturday and Sunday: on a weekday, "this weekend" and "last weekend" both mean the one just gone.
  const weekendNow = [0, 6].includes(today.getDay());
  if (says(want, ["this weekend", "ten weekend", "w ten weekend", "w tym weekendzie"])) {
    const monday = mondayOf(today);
    if (weekendNow) return { from: ymd(dayOf(monday, 5)), to: upTo(dayOf(monday, 6)) };
    // Looking ahead, on a weekday it is the coming one.
    return ahead ? { from: ymd(dayOf(monday, 5)), to: ymd(dayOf(monday, 6)) } : { from: ymd(dayOf(monday, -2)), to: ymd(dayOf(monday, -1)) };
  }
  if (says(want, ["last weekend", "zeszły weekend", "w zeszły weekend", "ostatni weekend", "w ostatni weekend"])) {
    const monday = mondayOf(today);
    return { from: ymd(dayOf(monday, -2)), to: ymd(dayOf(monday, -1)) };
  }
  if (says(want, ["this month", "ten miesiąc", "w tym miesiącu"])) return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: upTo(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  if (says(want, ["last month", "zeszły miesiąc", "w zeszłym miesiącu"])) {
    return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)) };
  }
  if (says(want, ["this year", "ten rok", "w tym roku"])) return { from: ymd(new Date(today.getFullYear(), 0, 1)), to: upTo(new Date(today.getFullYear(), 11, 31)) };
  if (says(want, ["last year", "zeszły rok", "w zeszłym roku", "ubiegły rok", "w ubiegłym roku"])) {
    return { from: `${today.getFullYear() - 1}-01-01`, to: `${today.getFullYear() - 1}-12-31` };
  }
  weekdays ??= weekdayNames();
  const weekday = want.length >= 3 ? weekdays.findIndex((names) => names.includes(want)) : -1;
  if (weekday >= 0) return one(dayOf(today, -((today.getDay() - weekday + 7) % 7)));
  const found = /^(\d{1,2}) (\p{L}+)$/u.exec(want) ?? /^(\p{L}+) (\d{1,2})$/u.exec(want);
  if (found) {
    const [day, word] = /^\d/.test(found[1]!) ? [Number(found[1]), found[2]!] : [Number(found[2]), found[1]!];
    const month = monthOf(word);
    if (month < 0 || day < 1 || day > 31) return null;
    // Looking ahead, the nearest such day either side of today: "Oct 24" on the 22nd is this Saturday.
    if (ahead) {
      const near = [-1, 0, 1]
        .map((shift) => new Date(today.getFullYear() + shift, month, day))
        .filter((date) => date.getMonth() === month)
        .sort((a, b) => Math.abs(a.getTime() - today.getTime()) - Math.abs(b.getTime() - today.getTime()))[0];
      if (near) return one(near);
    }
    // The latest such day that has come: this year's, else an earlier year's ("Feb 29" looks back to its leap year).
    for (let back = 0; back <= 8; back++) {
      const date = new Date(today.getFullYear() - back, month, day);
      // "Feb 30" rolls into March: not that day at all.
      if (date.getMonth() === month && date.getTime() <= today.getTime() + DAY_MS / 2) return one(date);
    }
    return null;
  }
  return null;
}
