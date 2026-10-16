import { t, tn } from "../i18n";
import type { FightNotes } from "./useFishingGame";
import { grabNote } from "./grab";

/** The landed card's line on how the fish was played, or null when there is nothing to tell. */
export function fightNotesText(notes: FightNotes | undefined): string | null {
  if (!notes) return null;
  const parts: string[] = [];
  // Landed on the edge of a snap or an escape: said first, as the story of the fight.
  if (notes.closeCall) parts.push(t("Close call"));
  if (notes.perfectCast) parts.push(t("Perfect cast"));
  if (notes.hookedSolid) parts.push(t("Hooked solid"));
  if (notes.secondTake) parts.push(t("On the second take"));
  if (notes.gotAway) parts.push(t("The one that got away"));
  if (notes.grabbed) parts.push(grabNote(notes.grabbed));
  if (notes.turnedRuns > 0) parts.push(tn(notes.turnedRuns, "Turned {n} run", "Turned {n} runs"));
  if (notes.clearOf === "weeds") parts.push(t("Kept it out of the weeds"));
  if (notes.clearOf === "rocks") parts.push(t("Kept it off the rocks"));
  if (notes.clearOf === "pilings") parts.push(t("Kept it clear of the pilings"));
  if (notes.clearOf === "current") parts.push(t("Turned it upstream every time"));
  if ((notes.bowedLeaps ?? 0) > 0) parts.push(tn(notes.bowedLeaps!, "Bowed to {n} leap", "Bowed to {n} leaps"));
  if ((notes.followedDarts ?? 0) > 0) parts.push(tn(notes.followedDarts!, "Followed {n} dart", "Followed {n} darts"));
  if ((notes.easedShakes ?? 0) > 0) parts.push(tn(notes.easedShakes!, "Eased off {n} head shake", "Eased off {n} head shakes"));
  if (notes.encore) parts.push(t("Rode out a second run at the net"));
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
