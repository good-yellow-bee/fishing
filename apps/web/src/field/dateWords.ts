import { localDate } from "@stillwater/shared";

/** A run of local days, both ends included, as "YYYY-MM-DD". */
export type DayRange = { from: string; to: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayOf(base: Date, shift: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + shift);
}

function ymd(date: Date): string {
  return localDate(date);
}

/** Lower case, no dots or doubled spaces: "Oct. 15" reads as "oct 15". */
function plain(text: string): string {
  return text.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
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
    return [...names].filter(Boolean);
  });
}

/** A weekday's whole name in English and Polish, Sunday first as Date.getDay counts them. */
function weekdayNames(): string[][] {
  return Array.from({ length: 7 }, (_, day) => {
    // 2026-10-11 was a Sunday.
    const at = new Date(2026, 9, 11 + day);
    const names = new Set<string>();
    for (const lang of LANGS) {
      // Whole names only: "sun" and "wed" already find sunny days and notes.
      names.add(plain(new Intl.DateTimeFormat(lang, { weekday: "long" }).format(at)));
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

/** Monday of the week a day falls in. */
function mondayOf(day: Date): Date {
  return dayOf(day, -((day.getDay() + 6) % 7));
}

/**
 * The local days a date word names, or null for anything else: "today", "yesterday", "this week", "last week",
 * "this month", "last month", a weekday by its whole name (its latest, today included), "Oct 15" or "15 października" (this year's, or
 * last year's while that day is still to come). English and Polish both.
 */
export function dateWords(text: string, now = new Date()): DayRange | null {
  const want = plain(text);
  if (!want) return null;
  const today = dayOf(now, 0);
  const one = (date: Date): DayRange => ({ from: ymd(date), to: ymd(date) });
  if (["today", "dziś", "dzisiaj"].includes(want)) return one(today);
  if (["yesterday", "wczoraj"].includes(want)) return one(dayOf(today, -1));
  if (["this week", "ten tydzień", "w tym tygodniu"].includes(want)) return { from: ymd(mondayOf(today)), to: ymd(today) };
  if (["last week", "zeszły tydzień", "w zeszłym tygodniu", "ostatni tydzień"].includes(want)) {
    const monday = mondayOf(today);
    return { from: ymd(dayOf(monday, -7)), to: ymd(dayOf(monday, -1)) };
  }
  if (["this month", "ten miesiąc", "w tym miesiącu"].includes(want)) return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) };
  if (["last month", "zeszły miesiąc", "w zeszłym miesiącu"].includes(want)) {
    return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)) };
  }
  weekdays ??= weekdayNames();
  const weekday = want.length >= 3 ? weekdays.findIndex((names) => names.includes(want)) : -1;
  if (weekday >= 0) return one(dayOf(today, -((today.getDay() - weekday + 7) % 7)));
  const found = /^(\d{1,2}) (\p{L}+)$/u.exec(want) ?? /^(\p{L}+) (\d{1,2})$/u.exec(want);
  if (found) {
    const [day, word] = /^\d/.test(found[1]!) ? [Number(found[1]), found[2]!] : [Number(found[2]), found[1]!];
    const month = monthOf(word);
    if (month < 0 || day < 1 || day > 31) return null;
    let date = new Date(today.getFullYear(), month, day);
    // "Feb 30" rolls into March: not a day at all.
    if (date.getMonth() !== month) return null;
    if (date.getTime() > today.getTime() + DAY_MS / 2) date = new Date(today.getFullYear() - 1, month, day);
    return one(date);
  }
  return null;
}
