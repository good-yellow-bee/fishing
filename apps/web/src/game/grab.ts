import { canLand, FISH, type FishSpecies, type Profile, type SpotId } from "@stillwater/shared";
import { t } from "../i18n";

/** Share of small fish hooked where a bigger one hunts them that it hits on the way in. */
export const GRAB_ODDS = 0.25;
/** The hit comes once the small fish is reeled this far in: half the line left. */
export const GRAB_LINE = 0.5;

/** Who hunts whom, and where: a pike in the reeds takes a shiner, a largemouth off the point a bluegill, a walleye in open water a perch. */
export const GRABS: readonly { prey: string; spot: SpotId; predator: string }[] = [
  { prey: "golden-shiner", spot: "reeds", predator: "pike" },
  { prey: "bluegill", spot: "point", predator: "largemouth-bass" },
  { prey: "perch", spot: "open", predator: "walleye" },
];

/** The fish that grabs a small fish hooked at this bank, or null: never on a new angler's easy first fish, and only when the angler could land the grabber. */
export function grabberFor(preyId: string, spot: SpotId, profile: Pick<Profile, "strength" | "accuracy">, mercy: boolean, roll: number): FishSpecies | null {
  if (mercy || roll >= GRAB_ODDS) return null;
  const grab = GRABS.find((pair) => pair.prey === preyId && pair.spot === spot);
  const predator = grab && FISH.find((fish) => fish.id === grab.predator);
  return predator && canLand(profile, predator) ? predator : null;
}

/** The call when the grab comes, with the new fish's fight line. */
export function grabCall(preyId: string, line: string): string {
  if (preyId === "bluegill") return t("A largemouth bass grabbed your bluegill! {line}. Ease off when it runs.", { line });
  if (preyId === "perch") return t("A walleye grabbed your perch! {line}. Ease off when it runs.", { line });
  return t("A pike grabbed your shiner! {line}. Ease off when it runs.", { line });
}

/** The landed card's note on a fish that took the one on the line. */
export function grabNote(preyId: string): string {
  if (preyId === "bluegill") return t("Took it off your bluegill");
  if (preyId === "perch") return t("Took it off your perch");
  return t("Took it off your shiner");
}
