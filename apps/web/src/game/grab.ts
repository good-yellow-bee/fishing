import { canLand, FISH, type FishSpecies, type Profile, type SpotId } from "@stillwater/shared";

/** Share of golden shiners hooked at the reeds that a pike hits on the way in. */
export const GRAB_ODDS = 0.25;
/** The pike hits once the shiner is reeled this far in: half the line left. */
export const GRAB_LINE = 0.5;

/** The pike that grabs a small fish hooked at this bank, or null: only a shiner at the reeds, never on a new angler's easy first fish, and only when the angler could land the pike. */
export function grabberFor(preyId: string, spot: SpotId, profile: Pick<Profile, "strength" | "accuracy">, mercy: boolean, roll: number): FishSpecies | null {
  if (mercy || preyId !== "golden-shiner" || spot !== "reeds" || roll >= GRAB_ODDS) return null;
  const pike = FISH.find((fish) => fish.id === "pike");
  return pike && canLand(profile, pike) ? pike : null;
}
