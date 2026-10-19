import { BREACHERS, BROADSIDERS, CHARGERS, COVER_DIVERS, DARTERS, HEAD_SHAKERS, LEAPERS, LONG_RUNNERS, QUITTERS, ROLLERS, SCRAPPERS, SOFT_MOUTHS, STICKERS, TAIL_WALKERS, TOOTHY } from "./fight";
import { t } from "../i18n";

/** A kind of fish's own fight habits in words, for the fight card and the field guide. */
export function habitLines(speciesId: string): string[] {
  const lines: string[] = [];
  if (SOFT_MOUTHS.has(speciesId)) lines.push(t("Soft mouth: reel in the red and the hook tears out"));
  if (LEAPERS.has(speciesId)) lines.push(t("Jumper: every second run is a leap, so let go when it comes up"));
  if (BREACHERS.has(speciesId)) lines.push(t("Breacher: its first run is a leap, so let go when it comes up"));
  if (ROLLERS.has(speciesId)) lines.push(t("Roller: at the net it rolls on the line instead of running"));
  if (TAIL_WALKERS.has(speciesId)) lines.push(t("Tail-walker: its first leap dances across the top, so keep bowing till it's down"));
  if (SCRAPPERS.has(speciesId)) lines.push(t("Scrapper: pound for pound it fights hardest, so it tires slowly"));
  if (BROADSIDERS.has(speciesId)) lines.push(t("Circler: it turns its flat side and circles, so it comes in slowly till it tires"));
  if (QUITTERS.has(speciesId)) lines.push(t("Quitter: it fights hard for a moment, then gives up fast"));
  if (HEAD_SHAKERS.has(speciesId)) lines.push(t("Head-shaker: between runs it shakes its head, so ease off a moment when it does"));
  if (STICKERS.has(speciesId)) lines.push(t("Bottom-sticker: when it sulks it takes two pumps to lift, not one"));
  if (DARTERS.has(speciesId)) lines.push(t("Darter: halfway through a run it cuts back the other way, so switch sides to keep turning it"));
  if (COVER_DIVERS.has(speciesId)) lines.push(t("Cover-diver: at the reeds or the dock it buries itself in cover and stays put, so turn every run there"));
  if (LONG_RUNNERS.has(speciesId)) lines.push(t("Long runner: the first run is the long one, so let it go"));
  if (TOOTHY.has(speciesId)) lines.push(t("Sharp teeth: when it swallows the bait, they fray the line if the fight runs long"));
  if (CHARGERS.has(speciesId)) lines.push(t("Charger: once a fight it runs straight at you, so reel fast to keep the line tight"));
  return lines;
}
