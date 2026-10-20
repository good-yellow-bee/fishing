import { tn } from "../../i18n";
import { daysBetween } from "../spotOrder";

/** How long a record set on `day` has stood by `today`: in days from a month, in years from one; "" while it is new. */
export function recordStood(day: string, today: string): string {
  const days = daysBetween(day, today);
  if (days < 30) return "";
  if (days < 365) return tn(days, "{n} day ago", "{n} days ago");
  // Whole calendar years, as a birthday counts them: May 1 2025 is two years back on May 1 2027.
  const years = Number(today.slice(0, 4)) - Number(day.slice(0, 4)) - (today.slice(5) < day.slice(5) ? 1 : 0);
  // A leap year's 365 days short of a calendar year still read in days.
  return years < 1 ? tn(days, "{n} day ago", "{n} days ago") : tn(years, "{n} year ago", "{n} years ago");
}
