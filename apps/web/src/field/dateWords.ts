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
let dayHeads: Set<string> | null = null;

/** Whether a word is a weekday as a written date opens with it: "wed", "wednesday", "śr", "środa". */
function isDayHead(word: string): boolean {
  dayHeads ??= new Set(
    Array.from({ length: 7 }, (_, day) => new Date(2026, 9, 11 + day)).flatMap((at) =>
      LANGS.flatMap((lang) => (["short", "long"] as const).map((weekday) => plain(new Intl.DateTimeFormat(lang, { weekday }).format(at)))),
    ),
  );
  return dayHeads.has(word);
}

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
  // "w czerwcu", "in june", "during may".
  const word = plain(text).replace(/^(?:we?|in|during) /, "");
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
 * "this month", "last month", "last night", a weekday by its whole name (its latest, today included; "last saturday" the one
 * before today), "Oct 15" or "15 października" (this year's, or
 * last year's while that day is still to come). English and Polish both. With `ahead` (outings, which can be planned),
 * "this week", "this month" and "this year" run to their ends, "this weekend" on a weekday is the coming one, "Oct 24"
 * is the nearest such day, a weekday is the coming one, and "tomorrow", "next week", "next weekend" and "next saturday"
 * are read too.
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
  // A night session is dated by its evening, as the outing form's "Last night" pick dates it.
  if (says(want, ["last night", "wczoraj wieczorem", "wczoraj w nocy", "zeszłej nocy", "zeszłego wieczoru"])) return one(dayOf(today, -1));
  weekdays ??= weekdayNames();
  // "on saturday", "w sobotę", "this saturday", "last saturday", "w zeszłą sobotę", "next saturday", "za tydzień w sobotę":
  // the weekday with the words the outing form and people put round it.
  const dayWords = /^(?:(?:on|we?) )?(?:(this|ten|ta|te|last|zeszl[aey]|ostatni[aey]?|next|przyszl[aey]|za tydzien w) )?(\p{L}+)$/u.exec(want);
  const weekday = dayWords && dayWords[2]!.length >= 3 ? weekdays.findIndex((names) => names.includes(dayWords[2]!)) : -1;
  if (weekday >= 0) {
    const which = dayWords![1] ?? "";
    const back = (today.getDay() - weekday + 7) % 7;
    const coming = (weekday - today.getDay() + 7) % 7;
    // The latest one before today.
    if (/^(?:last|zeszl|ostatni)/.test(which)) return one(dayOf(today, -(back || 7)));
    // As the outing form names it: the coming one, or the week after when that is today or tomorrow.
    if (/^(?:next|przyszl|za tydzien)/.test(which)) return ahead ? one(dayOf(today, coming >= 2 ? coming : coming + 7)) : null;
    // On its own: the coming one (today included) looking ahead, else the latest (today included).
    return one(dayOf(today, ahead ? coming : -back));
  }
  // Numbers alone, with the year or with a slash, which no size has: "31.12.2025", "12/31/2025", "12/31", "31/12".
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  const slashed = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(text.trim());
  if (dotted) return dayIn(Number(dotted[2]) - 1, Number(dotted[1]), Number(dotted[3]));
  // Day and month alone, as Polish writes a day ("31.12", "5.10."): the month in two digits, so a "1.5" in a lure's
  // name or a note stays a word.
  const dayMonth = /^(\d{1,2})\.(\d{2})\.?$/.exec(text.trim());
  if (dayMonth) return dayIn(Number(dayMonth[2]) - 1, Number(dayMonth[1]), null);
  if (slashed) {
    // Month first, as English writes it, unless the first can't be a month.
    const [month, day] = Number(slashed[1]) > 12 ? [Number(slashed[2]), Number(slashed[1])] : [Number(slashed[1]), Number(slashed[2])];
    return dayIn(month - 1, day, slashed[3] ? Number(slashed[3]) : null);
  }
  // A day as the cards write it, its weekday and commas and all: "Wed, Dec 31, 2025", "śr., 31 gru 2025", "1 czerwca 2025".
  const words = want.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 3 && isDayHead(words[0]!)) words.shift();
  const written = words.join(" ");
  const found = /^(\d{1,2}) (\p{L}+)(?: (\d{4}))?$/u.exec(written) ?? /^(\p{L}+) (\d{1,2})(?: (\d{4}))?$/u.exec(written);
  if (found) {
    const [day, word] = /^\d/.test(found[1]!) ? [Number(found[1]), found[2]!] : [Number(found[2]), found[1]!];
    return dayIn(monthOf(word), day, found[3] ? Number(found[3]) : null);
  }
  return null;

  /** That day of that month: in the year given, else as a date with no year reads (below). */
  function dayIn(month: number, day: number, year: number | null): DayRange | null {
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    if (year !== null) {
      const date = new Date(year, month, day);
      return date.getMonth() === month ? one(date) : null;
    }
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
}
