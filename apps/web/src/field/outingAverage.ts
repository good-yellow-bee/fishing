import type { Trip } from "@stillwater/shared";
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
  const average = t("{n} fish an outing on average", { n: num(counts.reduce((sum, count) => sum + count, 0) / fished.length) });
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
export function outingStreak(trips: readonly Trip[], fishOn: (tripId: string) => number, today: string): { best: number; going: boolean } {
  // Two outings on one day are one step, fished if either gave a fish: their order within the day isn't known.
  const days = new Map<string, boolean>();
  for (const trip of trips) {
    if (trip.date > today || (trip.date === today && fishOn(trip.id) === 0)) continue;
    days.set(trip.date, (days.get(trip.date) ?? false) || fishOn(trip.id) > 0);
  }
  let best = 0;
  let run = 0;
  for (const day of [...days.keys()].sort()) {
    run = days.get(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { best, going: best > 0 && run === best };
}
