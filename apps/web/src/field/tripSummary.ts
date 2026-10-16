import type { CatchEntry, Trip } from "@stillwater/shared";
import { t } from "../i18n";
import { measuresText } from "../i18n/content";
import { fishCountLabel, formatCatchDay, formatDay, formatTimeOfDay, noteText } from "./format";

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

/** One fish as plain text: what it was, its size and lure, then when and where, and its note. */
export function catchSummary(entry: CatchEntry, spotName: string | null): string {
  const what = [t(entry.species), measuresText(entry), t(entry.lure), ...(entry.released ? [t("Released")] : [])].join(", ");
  const when = [`${formatCatchDay(entry.caughtAt)} ${formatTimeOfDay(entry.caughtAt)}`, ...(spotName ? [spotName] : [])].join(" · ");
  const note = noteText(entry.note).trim();
  return [what, when, ...(note ? ["", note] : [])].join("\n");
}
