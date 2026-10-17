import { localDate } from "@stillwater/shared";
import { num, t } from "../i18n";

/** The usual wait between fish on one day's outing, "one every 25 min", or null when there are too few fish or too short a span to say. */
export function fishPace(first: string, last: string, count: number): string | null {
  if (count < 3 || localDate(new Date(first)) !== localDate(new Date(last))) return null;
  const minutes = (new Date(last).getTime() - new Date(first).getTime()) / 60000 / (count - 1);
  if (!(minutes >= 1)) return null;
  const gap = minutes < 90 ? t("{n} min", { n: Math.round(minutes) }) : t("{n} h", { n: num(minutes / 60) });
  return t("one every {gap} on average", { gap });
}

/** "Last fish 40 min ago", for an outing out on the water today; null once the last fish is under a minute or over 12 hours old. */
export function sinceLastFish(caughtAt: string, now: Date = new Date()): string | null {
  const minutes = (now.getTime() - new Date(caughtAt).getTime()) / 60000;
  if (!(minutes >= 1) || minutes > 12 * 60) return null;
  const time = minutes < 90 ? t("{n} min", { n: Math.round(minutes) }) : t("{n} h", { n: num(minutes / 60) });
  return t("Last fish {time} ago", { time });
}

/** The busiest hour of an outing: the most fish in any 60 minutes and when that hour began; null under three fish in it, or when it held them all. */
export function busiestHour(times: readonly string[]): { count: number; from: string } | null {
  const sorted = times.map((time) => ({ time, at: Date.parse(time) })).filter((each) => Number.isFinite(each.at)).sort((a, b) => a.at - b.at);
  let best: { count: number; from: string } | null = null;
  for (let start = 0, end = 0; start < sorted.length; start++) {
    while (end < sorted.length && sorted[end]!.at - sorted[start]!.at <= 60 * 60000) end++;
    if (!best || end - start > best.count) best = { count: end - start, from: sorted[start]!.time };
  }
  return best && best.count >= 3 && best.count < sorted.length ? best : null;
}

/** The fish weighed on an outing, all together, once two or more were. */
export function totalWeight(pounds: readonly (number | null)[]): { pounds: number; count: number } | null {
  const weighed = pounds.filter((each): each is number => each !== null && each > 0);
  return weighed.length >= 2 ? { pounds: weighed.reduce((sum, each) => sum + each, 0), count: weighed.length } : null;
}
