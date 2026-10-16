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

/**
 * "The most fish of any outing on this water" when this outing beats every other one fished here.
 * Null until the water has three outings fished, or when another outing caught as many.
 */
export function bestOutingHere(trips: readonly Trip[], fishOn: (tripId: string) => number, tripId: string, today: string): string | null {
  const fished = trips.filter((trip) => trip.date < today || (trip.date === today && fishOn(trip.id) > 0));
  if (fished.length < 3 || !fished.some((trip) => trip.id === tripId)) return null;
  const mine = fishOn(tripId);
  if (mine === 0 || fished.some((trip) => trip.id !== tripId && fishOn(trip.id) >= mine)) return null;
  return t("The most fish of any outing on this water");
}

/**
 * The longest run of outings in a row, by date, that each gave at least one fish, and whether the latest outings are still on it.
 * Planned outings don't count, and today's only once it has a fish.
 */
export function outingStreak(trips: readonly Trip[], fishOn: (tripId: string) => number, today: string): { best: number; going: boolean } {
  const fished = trips
    .filter((trip) => trip.date < today || (trip.date === today && fishOn(trip.id) > 0))
    .sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let run = 0;
  for (const trip of fished) {
    run = fishOn(trip.id) > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { best, going: best > 0 && run === best };
}
