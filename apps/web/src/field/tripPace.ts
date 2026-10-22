import { num, t } from "../i18n";

/** The usual wait between fish on one day's outing, "one every 25 min", or null when there are too few fish or too short a span to say. */
export function fishPace(first: string, last: string, count: number): string | null {
  // One session, even one running past midnight: not fish days apart.
  if (count < 3 || !(new Date(last).getTime() - new Date(first).getTime() <= 12 * 3_600_000)) return null;
  const minutes = (new Date(last).getTime() - new Date(first).getTime()) / 60000 / (count - 1);
  if (!(minutes >= 1)) return null;
  return t("one every {gap} on average", { gap: minutesText(minutes) });
}

/** "Last fish 40 min ago", for an outing out on the water today; null once the last fish is under a minute or over 12 hours old. */
export function sinceLastFish(caughtAt: string, now: Date = new Date()): string | null {
  const minutes = (now.getTime() - new Date(caughtAt).getTime()) / 60000;
  if (!(minutes >= 1) || minutes > 12 * 60) return null;
  return t("Last fish {time} ago", { time: minutesText(minutes) });
}

/** "40 min", "1.5 h": a stretch of an outing in the words its lines say it in. */
export function minutesText(minutes: number): string {
  const rounded = Math.round(minutes);
  return rounded < 90 ? t("{n} min", { n: rounded }) : t("{n} h", { n: num(minutes / 60) });
}

/** An outing's fish times, earliest first, leaving out any that can't be read. */
function inOrder(times: readonly string[]): { time: string; at: number }[] {
  return times.map((time) => ({ time, at: Date.parse(time) })).filter((each) => Number.isFinite(each.at)).sort((a, b) => a.at - b.at);
}

/**
 * The longest wait between two fish of one session (first to last fish within 12 hours), in minutes, and when the fish
 * before it came. Null under three fish, or unless the wait is at least half an hour and at least 1.5 times the usual
 * one: shorter, the pace already says it.
 */
export function longestWait(times: readonly string[]): { minutes: number; from: string } | null {
  const sorted = inOrder(times);
  if (sorted.length < 3) return null;
  const span = sorted.at(-1)!.at - sorted[0]!.at;
  if (span > 12 * 3_600_000) return null;
  let best = { minutes: 0, from: sorted[0]!.time };
  for (let i = 1; i < sorted.length; i++) {
    const minutes = (sorted[i]!.at - sorted[i - 1]!.at) / 60000;
    if (minutes > best.minutes) best = { minutes, from: sorted[i - 1]!.time };
  }
  const usual = span / 60000 / (sorted.length - 1);
  return best.minutes >= 30 && best.minutes >= 1.5 * usual ? best : null;
}

/** The busiest hour of an outing: the most fish in any 60 minutes and when that hour began; null under three fish in it, or when it held them all. */
export function busiestHour(times: readonly string[]): { count: number; from: string } | null {
  const sorted = inOrder(times);
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
