import { useEffect, useState } from "react";
import { moonPhase } from "@stillwater/shared";

/** While the moon passes overhead or underfoot the fish come on the feed, so every cast bites sooner. */
export const MOON_FEED_WAIT = 0.85;
/** Hours either side of the moon's passing that the fish feed. */
export const MOON_FEED_HOURS = 1;

export type MoonPass = "overhead" | "underfoot";

/** Hours since midnight, with the minutes as a fraction. */
function clockHours(date: Date) {
  return date.getHours() + date.getMinutes() / 60;
}

/** The hour of the day the moon passes overhead: at noon at new moon, at midnight at full, about 50 minutes later each day. */
export function moonOverheadHour(date: Date) {
  return (12 + 24 * moonPhase(date)) % 24;
}

/** Whether the moon is passing overhead or underfoot now, within MOON_FEED_HOURS either side, else null. */
export function moonPassing(date: Date): MoonPass | null {
  const since = (((clockHours(date) - moonOverheadHour(date)) % 24) + 24) % 24;
  if (since <= MOON_FEED_HOURS || since >= 24 - MOON_FEED_HOURS) return "overhead";
  if (Math.abs(since - 12) <= MOON_FEED_HOURS) return "underfoot";
  return null;
}

/** How the moon's passing moves the wait: MOON_FEED_WAIT while it passes overhead or underfoot, else 1. */
export function moonFeedWaitMul(date: Date) {
  return moonPassing(date) ? MOON_FEED_WAIT : 1;
}

/** The moon's passing that falls in the waking day (7:00 to 19:00) of this date, and its hour rounded for the chalk board. */
export function daytimeMoonPass(date: Date): { pass: MoonPass; hour: number } {
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const overhead = moonOverheadHour(noon);
  return overhead >= 7 && overhead < 19 ? { pass: "overhead", hour: Math.round(overhead) } : { pass: "underfoot", hour: Math.round((overhead + 12) % 24) };
}

/** The moon's passing now, checked every half minute, so the stance chip can say so. */
export function useMoonPassing() {
  const [passing, setPassing] = useState(() => moonPassing(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setPassing(moonPassing(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return passing;
}
