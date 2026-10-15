import { t, tn } from "../i18n";
import type { FightNotes } from "./useFishingGame";

/** The landed card's line on how the fish was played, or null when there is nothing to tell. */
export function fightNotesText(notes: FightNotes | undefined): string | null {
  if (!notes) return null;
  const parts: string[] = [];
  // Landed on the edge of a snap or an escape: said first, as the story of the fight.
  if (notes.closeCall) parts.push(t("Close call"));
  if (notes.perfectCast) parts.push(t("Perfect cast"));
  if (notes.hookedSolid) parts.push(t("Hooked solid"));
  if (notes.turnedRuns > 0) parts.push(tn(notes.turnedRuns, "Turned {n} run", "Turned {n} runs"));
  if ((notes.cleanRun ?? 0) >= 2) parts.push(t("{n} clean fights in a row", { n: notes.cleanRun! }));
  if (notes.fightSec !== undefined) parts.push(landedIn(notes.fightSec));
  return parts.length ? parts.join(" · ") : null;
}

/** How long the fight took, in whole seconds, with minutes once it passes one. */
function landedIn(fightSec: number): string {
  const total = Math.max(1, Math.round(fightSec));
  if (total < 60) return t("Landed in {s} s", { s: total });
  return t("Landed in {m} min {s} s", { m: Math.floor(total / 60), s: total % 60 });
}
