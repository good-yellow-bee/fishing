import { tn } from "../../i18n";
import { daysBetween } from "../spotOrder";

/** How long a record set on `day` has stood by `today`: in days from a month, in years from one; "" while it is new. */
export function recordStood(day: string, today: string): string {
  const days = daysBetween(day, today);
  if (days < 30) return "";
  return days < 365 ? tn(days, "{n} day ago", "{n} days ago") : tn(Math.floor(days / 365.25) || 1, "{n} year ago", "{n} years ago");
}
