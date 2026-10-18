import { localDate, type Trip } from "@stillwater/shared";
import { num, t, tn } from "../i18n";

/**
 * How the outings already fished here went: "2.5 fish an outing on average, 1 without a fish".
 * Null with fewer than two such outings, where an average says nothing.
 */
export function outingAverage(trips: readonly Trip[], fishOn: (tripId: string) => number, today: string): string | null {
  // Today's outing counts once it has a fish; until then it is still the day's plan.
  const fished = trips.filter((trip) => trip.date < today || (trip.date === today && fishOn(trip.id) > 0));
  if (fished.length < 2) return null;
  const counts = fished.map((trip) => fishOn(trip.id));
  // A few fish over many outings still reads as a few, not "0".
  const mean = counts.reduce((sum, count) => sum + count, 0) / fished.length;
  const average = t("{n} fish an outing on average", { n: num(mean, mean > 0 && mean < 0.1 ? 2 : 1) });
  const blank = counts.filter((count) => count === 0).length;
  // Joined as the language reads it: Polish decimal commas would run "1,7, 1" together.
  return blank > 0 ? t("{average}, {blank}", { average, blank: tn(blank, "{n} without a fish", "{n} without a fish") }) : average;
}

/** The outing on a water that caught strictly more fish than every other one fished there, once three have been fished. */
export function topOuting(trips: readonly Trip[], fishOn: (tripId: string) => number, today: string): Trip | null {
  const fished = trips.filter((trip) => trip.date < today || (trip.date === today && fishOn(trip.id) > 0));
  if (fished.length < 3) return null;
  const top = fished.reduce((best, trip) => (fishOn(trip.id) > fishOn(best.id) ? trip : best));
  if (fishOn(top.id) === 0 || fished.some((trip) => trip.id !== top.id && fishOn(trip.id) === fishOn(top.id))) return null;
  return top;
}

/**
 * The latest outing fished before a day: today's counts once it has a fish, a planned one never.
 * "Last time here" on an outing and its form, so both name the same day.
 */
export function lastOutingBefore(trips: readonly Trip[], before: string, today: string, fishOn: (tripId: string) => number): Trip | undefined {
  return trips
    .filter((trip) => trip.date < before && (trip.date < today || (trip.date === today && fishOn(trip.id) > 0)))
    .reduce<Trip | undefined>((last, trip) => (!last || trip.date > last.date ? trip : last), undefined);
}

/**
 * "The most fish of any outing on this water" when this outing beats every other one fished here.
 * Null until the water has three outings fished, or when another outing caught as many.
 */
export function bestOutingHere(trips: readonly Trip[], fishOn: (tripId: string) => number, tripId: string, today: string): string | null {
  return topOuting(trips, fishOn, today)?.id === tripId ? t("The most fish of any outing on this water") : null;
}

/**
 * The longest run of outings in a row, by date, that each gave at least one fish, and whether the latest outings are still on it.
 * Planned outings don't count, and today's only once it has a fish. `looseDays` are the days of fish logged without an
 * outing: each is a fished day too, so a blank spell ends with the fish that came after it.
 */
export function outingStreak(
  trips: readonly Trip[],
  fishOn: (tripId: string) => number,
  today: string,
  looseDays: Iterable<string> = [],
): { best: number; going: boolean; dry: number; dryNow: number } {
  // Each outing is a step. Two on one day are in no known order: the run counts them all when both gave a fish, and a
  // day with a blank among them ends it (and ends a dry spell when one gave a fish).
  const days = new Map<string, { outings: number; fished: number }>();
  for (const trip of trips) {
    if (trip.date > today || (trip.date === today && fishOn(trip.id) === 0)) continue;
    const day = days.get(trip.date) ?? { outings: 0, fished: 0 };
    days.set(trip.date, { outings: day.outings + 1, fished: day.fished + (fishOn(trip.id) > 0 ? 1 : 0) });
  }
  for (const day of looseDays) {
    if (day > today) continue;
    const held = days.get(day);
    days.set(day, held ? { ...held, fished: held.outings } : { outings: 1, fished: 1 });
  }
  let best = 0;
  let run = 0;
  // The longest run the other way: outings in a row that came home without a fish.
  let dry = 0;
  let dryRun = 0;
  for (const day of [...days.keys()].sort()) {
    const { outings, fished } = days.get(day)!;
    run = fished === outings ? run + outings : 0;
    dryRun = fished === 0 ? dryRun + outings : 0;
    best = Math.max(best, run);
    dry = Math.max(dry, dryRun);
  }
  return { best, going: best > 0 && run === best, dry, dryNow: dryRun };
}

/** The Monday that starts the week of a YYYY-MM-DD day, `ahead` weeks on, as YYYY-MM-DD. */
function weekOf(date: string, ahead = 0): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const day = new Date(y, m - 1, d, 12);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7) + ahead * 7);
  return localDate(day);
}

/**
 * The longest run of weeks in a row (Monday to Sunday) with an outing, fish or not, and whether it is still going:
 * this week's or last week's outing keeps it alive, as this week may still bring one. Planned outings don't count, nor
 * today's until it has a fish when `fishOn` is given, as the averages take it.
 */
export function weekStreak(trips: readonly Trip[], today: string, fishOn?: (tripId: string) => number): { best: number; going: boolean } {
  const done = (trip: Trip) => trip.date < today || (trip.date === today && (!fishOn || fishOn(trip.id) > 0));
  const weeks = [...new Set(trips.filter(done).map((trip) => weekOf(trip.date)))].sort();
  let best = 0;
  let run = 0;
  let last = "";
  for (const week of weeks) {
    run = last && weekOf(last, 1) === week ? run + 1 : 1;
    best = Math.max(best, run);
    last = week;
  }
  const alive = last !== "" && (last === weekOf(today) || weekOf(last, 1) === weekOf(today));
  return { best, going: alive && run === best };
}

/**
 * Fish an outing on Saturdays and Sundays against the rest of the week, once each side has two outings fished:
 * whether a day off midweek pays.
 */
export function weekendSplit(trips: readonly Trip[], fishOn: (tripId: string) => number, today: string): { weekend: number; weekday: number } | null {
  const fished = trips.filter((trip) => trip.date < today || (trip.date === today && fishOn(trip.id) > 0));
  const [weekend, weekday] = [true, false].map((wanted) =>
    fished.filter((trip) => {
      const [y, m, d] = trip.date.split("-").map(Number);
      return [0, 6].includes(new Date(y!, m! - 1, d!).getDay()) === wanted;
    }),
  );
  if (weekend!.length < 2 || weekday!.length < 2) return null;
  const average = (list: readonly Trip[]) => list.reduce((sum, trip) => sum + fishOn(trip.id), 0) / list.length;
  return { weekend: average(weekend!), weekday: average(weekday!) };
}

/** The fish an outing here averages, leaving out `exceptId`, once two other outings have been fished; null before. */
export function outingMean(trips: readonly Trip[], fishOn: (tripId: string) => number, today: string, exceptId: string): number | null {
  const fished = trips.filter((trip) => trip.id !== exceptId && (trip.date < today || (trip.date === today && fishOn(trip.id) > 0)));
  if (fished.length < 2) return null;
  return fished.reduce((sum, trip) => sum + fishOn(trip.id), 0) / fished.length;
}
