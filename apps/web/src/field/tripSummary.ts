import type { CatchEntry, Trip } from "@stillwater/shared";
import { t } from "../i18n";
import { measuresText } from "../i18n/content";
import { fishCountLabel, formatDay, formatTimeOfDay } from "./format";

/** An outing as plain text to paste into a message: the day, the water, then each fish in the order it came. */
export function tripSummary(trip: Trip, spotName: string | null, catches: readonly CatchEntry[]): string {
  const head = [trip.title, formatDay(trip.date), ...(spotName ? [spotName] : [])].join(" · ");
  const fish = [...catches]
    .sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))
    .map((entry) => {
      const parts = [`${formatTimeOfDay(entry.caughtAt)} ${t(entry.species)}`, measuresText(entry), t(entry.lure), ...(entry.released ? [t("Released")] : [])];
      return `- ${parts.join(", ")}`;
    });
  return [head, fishCountLabel(catches.length), ...fish, ...(trip.note.trim() ? ["", trip.note.trim()] : [])].join("\n");
}
