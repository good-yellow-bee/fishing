import { canLand, FISH, type FishSpecies, type Profile, type SpotId } from "@stillwater/shared";
import { t } from "../i18n";

/** Share of small fish hooked where a bigger one hunts them that it hits on the way in. */
export const GRAB_ODDS = 0.25;
/** The hit comes once the small fish is reeled this far in: half the line left. */
export const GRAB_LINE = 0.5;

/**
 * Who hunts whom, and where: a pike in the reeds takes a shiner, a largemouth off the point a bluegill, a walleye in open
 * water a perch, a smallmouth under the dock a crappie, and a pike off the drop-off a perch.
 */
export const GRABS: readonly { prey: string; spot: SpotId; predator: string }[] = [
  { prey: "golden-shiner", spot: "reeds", predator: "pike" },
  { prey: "bluegill", spot: "point", predator: "largemouth-bass" },
  { prey: "perch", spot: "open", predator: "walleye" },
  { prey: "crappie", spot: "dock", predator: "smallmouth-bass" },
  { prey: "perch", spot: "dropoff", predator: "pike" },
];

/** Share of the small fish not hit on the way in that the hunter takes after all once the angler lets it flutter. */
export const FLUTTER_ODDS = 0.25;
/** Seconds of calm the small fish has to flutter on a line left unreeled, out past the halfway mark, before the hunter comes for it. */
export const FLUTTER_SEC = 1.2;

/** Share of small fish landed there unhit that the hunter followed in to the bank without taking. */
export const FOLLOW_ODDS = 0.25;

/** The bigger fish hunting this small fish at this bank, when the angler could land it. */
function hunterOf(preyId: string, spot: SpotId, profile: Pick<Profile, "strength" | "accuracy">): FishSpecies | null {
  const grab = GRABS.find((pair) => pair.prey === preyId && pair.spot === spot);
  const predator = grab && FISH.find((fish) => fish.id === grab.predator);
  return predator && canLand(profile, predator) ? predator : null;
}

/** The fish that grabs a small fish hooked at this bank, or null: never on a new angler's easy first fish, and only when the angler could land the grabber. */
export function grabberFor(preyId: string, spot: SpotId, profile: Pick<Profile, "strength" | "accuracy">, mercy: boolean, roll: number): FishSpecies | null {
  if (mercy || roll >= GRAB_ODDS) return null;
  return hunterOf(preyId, spot, profile);
}

/** The hunter that comes for a small fish left to flutter on the line, or null; rolled apart from the grab, for a fish that wasn't grabbed. */
export function flutterGrabberFor(preyId: string, spot: SpotId, profile: Pick<Profile, "strength" | "accuracy">, mercy: boolean, roll: number): FishSpecies | null {
  if (mercy || roll >= FLUTTER_ODDS) return null;
  return hunterOf(preyId, spot, profile);
}

/** The hookset tip on a small fish hooked where a bigger one hunts it, or "": never on a new angler's easy first fish. */
export function flutterTip(preyId: string, spot: SpotId, profile: Pick<Profile, "strength" | "accuracy">, mercy: boolean): string {
  const hunter = mercy ? null : hunterOf(preyId, spot, profile);
  if (!hunter) return "";
  if (hunter.id === "largemouth-bass") return t("A largemouth bass hunts them here: stop reeling and let it flutter a moment, and the bass may take it.");
  if (hunter.id === "walleye") return t("A walleye hunts them here: stop reeling and let it flutter a moment, and the walleye may take it.");
  if (hunter.id === "smallmouth-bass") return t("A smallmouth bass hunts them here: stop reeling and let it flutter a moment, and the bass may take it.");
  return t("A pike hunts them here: stop reeling and let it flutter a moment, and the pike may take it.");
}

/** The fish that follows a small fish in without grabbing it, or null; rolled apart from the grab, for a fish that wasn't grabbed. */
export function followerFor(preyId: string, spot: SpotId, profile: Pick<Profile, "strength" | "accuracy">, mercy: boolean, roll: number): FishSpecies | null {
  if (mercy || roll >= FOLLOW_ODDS) return null;
  return hunterOf(preyId, spot, profile);
}

/** The landing hint when the hunter followed the small fish in. */
export function followCall(predator: FishSpecies): string {
  if (predator.id === "largemouth-bass") return t("A largemouth bass followed it in to the bank!");
  if (predator.id === "walleye") return t("A walleye followed it up to the boat!");
  if (predator.id === "smallmouth-bass") return t("A smallmouth bass followed it in to the dock!");
  return t("A pike followed it in to the bank!");
}

/** The call when the grab comes, naming the hunter and the fish it took, with the new fish's fight line. */
export function grabCall(preyId: string, predatorId: string, line: string): string {
  if (preyId === "bluegill") return t("A largemouth bass grabbed your bluegill! {line}. Ease off when it runs.", { line });
  if (preyId === "crappie") return t("A smallmouth bass grabbed your crappie! {line}. Ease off when it runs.", { line });
  if (preyId === "perch" && predatorId === "pike") return t("A pike grabbed your perch! {line}. Ease off when it runs.", { line });
  if (preyId === "perch") return t("A walleye grabbed your perch! {line}. Ease off when it runs.", { line });
  return t("A pike grabbed your shiner! {line}. Ease off when it runs.", { line });
}

/** The landed card's note on a fish that took the one on the line. */
export function grabNote(preyId: string): string {
  if (preyId === "bluegill") return t("Took it off your bluegill");
  if (preyId === "perch") return t("Took it off your perch");
  if (preyId === "crappie") return t("Took it off your crappie");
  return t("Took it off your shiner");
}
