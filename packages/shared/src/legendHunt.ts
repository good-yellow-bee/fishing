import { FISH, fishById } from "./fish.ts";
import { isTrophyWeight } from "./guide.ts";
import { LAKE_HOURS, type LakeHour } from "./hour.ts";
import type { FishSpecies, SpotId } from "./types.ts";

/** A solved hunt makes its legend bite this many times as often at its bank, for the rest of the week. */
export const LEGEND_HUNT_BITE = 3;

/** The week's rumor: which legend, the bank it haunts, the hour it was seen at, and the prey it follows there. */
export type Rumor = { legendId: string; spot: SpotId; hour: LakeHour; preyId: string };

/** A catch as the hunt's clues read it. */
export type HuntCatch = { speciesId: string; spot: string; hour: string | null; weight: number };

const legends = (): FishSpecies[] => FISH.filter((fish) => fish.rarity === "legendary").sort((a, b) => a.id.localeCompare(b.id));

function weekNumber(monday: string): number {
  return Math.round(Date.parse(`${monday}T12:00:00.000Z`) / (7 * 86_400_000));
}

/** The rumor for the week starting `monday`: the same for every angler, with no stored state. */
export function rumorFor(monday: string): Rumor {
  const week = weekNumber(monday);
  const all = legends();
  const legend = all[((week % all.length) + all.length) % all.length]!;
  const spot = legend.spots[((week % legend.spots.length) + legend.spots.length) % legend.spots.length]!;
  const prey = FISH.filter((fish) => fish.rarity === "common" && fish.spots.includes(spot)).sort((a, b) => a.id.localeCompare(b.id));
  return {
    legendId: legend.id,
    spot,
    hour: LAKE_HOURS[((week % LAKE_HOURS.length) + LAKE_HOURS.length) % LAKE_HOURS.length]!,
    preyId: prey[((week % prey.length) + prey.length) % prey.length]!.id,
  };
}

/** The three clues the week's catches have found: the prey at the bank, any fish there at the hour, and a trophy of any kind. */
export function huntClues(rumor: Rumor, catches: readonly HuntCatch[]): [boolean, boolean, boolean] {
  return [
    catches.some((row) => row.speciesId === rumor.preyId && row.spot === rumor.spot),
    catches.some((row) => row.spot === rumor.spot && row.hour === rumor.hour),
    catches.some((row) => {
      const species = fishById(row.speciesId);
      return species !== undefined && isTrophyWeight(species, row.weight);
    }),
  ];
}
