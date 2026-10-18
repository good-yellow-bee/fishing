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
  return blank > 0 ? `${average}, ${tn(blank, "{n} without a fish", "{n} without a fish")}` : average;
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
 * "The most fish of any outing on this water" when this outing beats every other one fished here.
 * Null until the water has three outings fished, or when another outing caught as many.
 */
export function bestOutingHere(trips: readonly Trip[], fishOn: (tripId: string) => number, tripId: string, today: string): string | null {
  return topOuting(trips, fishOn, today)?.id === tripId ? t("The most fish of any outing on this water") : null;
}

/**
 * The longest run of outings in a row, by date, that each gave at least one fish, and whether the latest outings are still on it.
 * Planned outings don't count, and today's only once it has a fish.
 */
export function outingStreak(trips: readonly Trip[], fishOn: (tripId: string) => number, today: string): { best: number; going: boolean; dry: number; dryNow: number } {
  // Two outings on one day are one step, fished if either gave a fish: their order within the day isn't known.
  const days = new Map<string, boolean>();
  for (const trip of trips) {
    if (trip.date > today || (trip.date === today && fishOn(trip.id) === 0)) continue;
    days.set(trip.date, (days.get(trip.date) ?? false) || fishOn(trip.id) > 0);
  }
  let best = 0;
  let run = 0;
  // The longest run the other way: outings in a row that came home without a fish.
  let dry = 0;
  let dryRun = 0;
  for (const day of [...days.keys()].sort()) {
    run = days.get(day) ? run + 1 : 0;
    dryRun = days.get(day) ? 0 : dryRun + 1;
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
 * this week's or last week's outing keeps it alive, as this week may still bring one. Planned outings don't count.
 */
export function weekStreak(trips: readonly Trip[], today: string): { best: number; going: boolean } {
  const weeks = [...new Set(trips.filter((trip) => trip.date <= today).map((trip) => weekOf(trip.date)))].sort();
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
