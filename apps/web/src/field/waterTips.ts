import { biteTimes, catchesForSpot, lakeSeason, localDate, moonTally, waterTempTally, type BiteTime, type MoonQuarter, type LakeSeason, type CatchEntry, type Logbook, type LureTally, type Sky, type Trip, type Wind, type WaterTempTally } from "@stillwater/shared";
import { pieceTally } from "./pieceTally";
import { shownPieceKey } from "./gear/pieceKey";
import { isSampleOuting } from "./bookCopy";
import { countedFish, ownFish } from "./milestones";

/** Below this many fish a water's "what works" line would be guesswork. */
export const TIPS_FROM = 3;

/** `id`: the fish it was noted with, for the day that fish counts on (a night's small hours on its outing's). */
export type WaterReading = { fahrenheit: number; at: string; id?: string };

export type WaterTips = {
  lures: LureTally[];
  time: BiteTime | null;
  sky: Sky | null;
  wind: Wind | null;
  moon: MoonQuarter | null;
  season: LakeSeason | null;
  temp: WaterTempTally | null;
  lastTemp: WaterReading | null;
};

/** The lures that took the most fish on one water, and the time of day that gave the most. */
export function waterTips(catches: readonly CatchEntry[]): WaterTips | null {
  if (catches.length < TIPS_FROM) return null;
  const book = { spots: [], trips: [], catches: [...catches] };
  const lures = pieceTally(catches, 3);
  // The time of day most fish came at, when at least two did and no other time ties it.
  const [top, next] = [...biteTimes(book)].sort((a, b) => b.count - a.count);
  const time: BiteTime | null = top && top.count >= 2 && (!next || next.count < top.count) ? top : null;
  return { lures, time, sky: leadingSky(catches), wind: leadingWind(catches), moon: leadingMoon(catches), season: leadingSeason(catches), temp: leadingTemp(catches), lastTemp: lastReading(catches) };
}

/** The band of water temperature most of the fish came in, when at least two noted it and one band clearly leads. */
function leadingTemp(catches: readonly CatchEntry[]): WaterTempTally | null {
  const [top, next] = waterTempTally({ spots: [], trips: [], catches: [...catches] }).sort((a, b) => b.count - a.count);
  if (!top || top.count < 2 || (next && next.count === top.count)) return null;
  return top;
}

/** The newest water temperature noted with a fish, and when. */
export function lastReading(catches: readonly CatchEntry[]): WaterReading | null {
  let last: WaterReading | null = null;
  for (const entry of catches) {
    const fahrenheit = entry.weather?.waterTempF;
    if (fahrenheit === undefined || !Number.isFinite(fahrenheit) || Number.isNaN(Date.parse(entry.caughtAt))) continue;
    if (!last || Date.parse(entry.caughtAt) > Date.parse(last.at)) last = { fahrenheit, at: entry.caughtAt, id: entry.id };
  }
  return last;
}

/**
 * The lure that clearly led in each band of water temperature: at least two fish on it and no tie. Only worth a line
 * when two bands or more name one, so it says which lure for which water.
 */
export function lureByTemp(catches: readonly CatchEntry[]): { band: WaterTempTally; lure: string }[] {
  const rows = waterTempTally({ spots: [], trips: [], catches: [...catches] }).flatMap((band) => {
    const inBand = catches.filter((entry) => {
      const temp = entry.weather?.waterTempF;
      return temp !== undefined && Number.isFinite(temp) && (band.from === null || temp >= band.from) && (band.to === null || temp < band.to);
    });
    const [top, next] = pieceTally(inBand, 2);
    return top && top.count >= 2 && (!next || next.count < top.count) ? [{ band, lure: top.lure }] : [];
  });
  // The same lure leading every band says nothing about temperature.
  return rows.length >= 2 && new Set(rows.map((row) => shownPieceKey(row.lure))).size >= 2 ? rows : [];
}

/** How far back an earlier reading still says which way the water is going. */
const TREND_DAYS = 21;

/**
 * The reading before the last one, from an earlier day within three weeks of it: with the last, whether the water
 * is warming or cooling. `differs` skips readings that show the same as the last, so a run of one degree looks back
 * to where it changed. Null without one.
 */
export function readingBefore(catches: readonly CatchEntry[], last: WaterReading | null, differs: (fahrenheit: number) => boolean = () => true): WaterReading | null {
  if (!last) return null;
  const lastAt = new Date(last.at);
  const lastDay = new Date(lastAt.getFullYear(), lastAt.getMonth(), lastAt.getDate()).getTime();
  let before: WaterReading | null = null;
  for (const entry of catches) {
    const fahrenheit = entry.weather?.waterTempF;
    const at = Date.parse(entry.caughtAt);
    if (fahrenheit === undefined || !Number.isFinite(fahrenheit) || Number.isNaN(at)) continue;
    if (at >= lastDay || lastDay - at > TREND_DAYS * 86_400_000 || !differs(fahrenheit)) continue;
    if (!before || at > Date.parse(before.at)) before = { fahrenheit, at: entry.caughtAt, id: entry.id };
  }
  return before;
}

/** The sky most of the fish came under, when at least two noted it and one sky clearly leads. */
function leadingSky(catches: readonly CatchEntry[]): Sky | null {
  const counts = new Map<Sky, number>();
  for (const entry of catches) if (entry.weather) counts.set(entry.weather.sky, (counts.get(entry.weather.sky) ?? 0) + 1);
  const [top, next] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || top[1] < 2 || (next && next[1] === top[1])) return null;
  return top[0];
}

/** The wind most of the fish came in, when at least two noted it and one wind clearly leads. */
function leadingWind(catches: readonly CatchEntry[]): Wind | null {
  const counts = new Map<Wind, number>();
  for (const entry of catches) if (entry.weather) counts.set(entry.weather.wind, (counts.get(entry.weather.wind) ?? 0) + 1);
  const [top, next] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || top[1] < 2 || (next && next[1] === top[1])) return null;
  return top[0];
}

/** The quarter of the moon most of the fish came under, once they span more than one and one clearly leads. */
function leadingMoon(catches: readonly CatchEntry[]): MoonQuarter | null {
  const [top, next] = moonTally({ spots: [], trips: [], catches: [...catches] }).sort((a, b) => b.count - a.count);
  if (!top || !next || next.count === 0 || top.count < 2 || next.count === top.count) return null;
  return top.id;
}

/** The season most of the fish came in, once they span more than one season and one clearly leads. */
function leadingSeason(catches: readonly CatchEntry[]): LakeSeason | null {
  const counts = new Map<LakeSeason, number>();
  for (const entry of catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const season = lakeSeason(at);
    counts.set(season, (counts.get(season) ?? 0) + 1);
  }
  const [top, next] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || !next || top[1] < 2 || next[1] === top[1]) return null;
  return top[0];
}

/** Lures worth packing for an outing still ahead: what has worked on its water. Nothing for a past outing. */
export function packingTips(book: Logbook, trip: Trip, today: string): string[] {
  if (trip.date < today) return [];
  // The angler's own fish for their own outing, as the water's page tips: the sample week's only for its own outings.
  const here = catchesForSpot(book, trip.spotId);
  const own = !isSampleOuting(trip) && book.catches.some(ownFish);
  return waterTips(own ? here.filter(ownFish) : countedFish(here))?.lures.map((row) => row.lure) ?? [];
}

/** The kinds of fish a water has given, most first: one-tap picks for the species on the catch form. */
export function waterSpecies(catches: readonly CatchEntry[], limit = 3): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const entry of catches) {
    const key = entry.species.trim().toLowerCase();
    const row = counts.get(key) ?? { name: entry.species, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((row) => row.name);
}

/** The lures that took this kind of fish on this water, most first; empty when the water hasn't given that kind. */
export function speciesLures(catches: readonly CatchEntry[], species: string, limit = 3): string[] {
  const want = species.trim().toLowerCase();
  if (!want) return [];
  const kind = catches.filter((entry) => entry.species.trim().toLowerCase() === want);
  return pieceTally(kind, limit).map((row) => row.lure);
}

/**
 * How the water warmed and cooled through the year of the newest reading, or the year before when the newest has one
 * month so far: the last reading of each month, in order, with the day it counts on. Empty when neither year has two
 * months. `dayOf` is the day a fish counts on ("2025-12-31" for a New Year's Eve night's small hours), its clock day
 * unless given.
 */
export function tempThroughYear(catches: readonly CatchEntry[], dayOf: (entry: CatchEntry) => string = (entry) => localDate(new Date(entry.caughtAt))): (WaterReading & { day: string })[] {
  const read = catches.filter((entry) => {
    const fahrenheit = entry.weather?.waterTempF;
    return fahrenheit !== undefined && Number.isFinite(fahrenheit) && !Number.isNaN(Date.parse(entry.caughtAt));
  });
  if (read.length === 0) return [];
  const newest = Math.max(...read.map((entry) => Number(dayOf(entry).slice(0, 4))));
  // Early in a season the newest year may have one month so far: last year's curve says more until it fills in.
  const inYear = readingsByMonth(read, newest, dayOf);
  return inYear.length >= 2 ? inYear : readingsByMonth(read, newest - 1, dayOf);
}

function readingsByMonth(catches: readonly CatchEntry[], year: number, dayOf: (entry: CatchEntry) => string): (WaterReading & { day: string })[] {
  const byMonth = new Map<string, WaterReading & { day: string }>();
  for (const entry of catches) {
    const day = dayOf(entry);
    if (Number(day.slice(0, 4)) !== year) continue;
    const month = day.slice(5, 7);
    const held = byMonth.get(month);
    if (!held || Date.parse(entry.caughtAt) > Date.parse(held.at)) byMonth.set(month, { fahrenheit: entry.weather!.waterTempF!, at: entry.caughtAt, day });
  }
  return byMonth.size < 2 ? [] : [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, reading]) => reading);
}
