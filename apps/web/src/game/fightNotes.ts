import { t, tn } from "../i18n";
import type { FightNotes } from "./useFishingGame";

/** The landed card's line on how the fish was played, or null when there is nothing to tell. */
export function fightNotesText(notes: FightNotes | undefined): string | null {
  if (!notes) return null;
  const parts: string[] = [];
  if (notes.perfectCast) parts.push(t("Perfect cast"));
  if (notes.hookedSolid) parts.push(t("Hooked solid"));
  if (notes.turnedRuns > 0) parts.push(tn(notes.turnedRuns, "Turned {n} run", "Turned {n} runs"));
  if ((notes.cleanRun ?? 0) >= 2) parts.push(t("{n} clean fights in a row", { n: notes.cleanRun! }));
  return parts.length ? parts.join(" · ") : null;
}
