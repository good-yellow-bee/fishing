import type { CatchEntry, Trip } from "@stillwater/shared";
import { t } from "../i18n";
import { measuresText } from "../i18n/content";
import { fishCountLabel, formatDatedDay, formatTimeOfDay, noteText } from "./format";

/**
 * An outing as plain text to paste into a message: the day, the water, then each fish in the order it came.
 * A fish from another water than the outing's names its own; the day carries its year, as the text may be read years on.
 */
export function tripSummary(trip: Trip, spotName: string | null, catches: readonly CatchEntry[], waterOf: (spotId: string) => string | null = () => null): string {
  const head = [trip.title, formatDatedDay(new Date(`${trip.date}T12:00:00`)), ...(spotName ? [spotName] : [])].join(" · ");
  const fish = [...catches]
    .sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))
    .map((entry) => {
      const elsewhere = entry.spotId !== trip.spotId ? waterOf(entry.spotId) : null;
      const parts = [`${formatTimeOfDay(entry.caughtAt)} ${t(entry.species)}`, measuresText(entry), t(entry.lure), ...(elsewhere ? [elsewhere] : []), ...(entry.released ? [t("Released")] : [])];
      return `- ${parts.join(", ")}`;
    });
  return [head, fishCountLabel(catches.length), ...fish, ...(trip.note.trim() ? ["", trip.note.trim()] : [])].join("\n");
}

/** One fish as plain text: what it was, its size and lure, then when and where, and its note. */
export function catchSummary(entry: CatchEntry, spotName: string | null): string {
  const what = [t(entry.species), measuresText(entry), t(entry.lure), ...(entry.released ? [t("Released")] : [])].join(", ");
  const when = [`${formatDatedDay(new Date(entry.caughtAt))} ${formatTimeOfDay(entry.caughtAt)}`, ...(spotName ? [spotName] : [])].join(" · ");
  const note = noteText(entry.note).trim();
  return [what, when, ...(note ? ["", note] : [])].join("\n");
}
