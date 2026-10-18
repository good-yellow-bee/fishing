import { FISH, type FishSpecies, type SpotId } from "@stillwater/shared";

export const RELEASED_KEY = "stillwater.released.v1";
/** Chance a cast at a bank brings up a fish let go there on an earlier day. */
export const RECAPTURE_ODDS = 0.06;
/** How much a let-go fish grows each week back in the lake. */
export const RECAPTURE_GROWTH_WEEK = 0.04;
/** The most a let-go fish grows, however long it was gone; never past its kind's top weight either. */
export const RECAPTURE_GROWTH_CAP = 0.3;
/** The lake remembers this many let-go fish, the newest first. */
export const RELEASED_KEEP = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A fish let go from the lake: its kind's id, its weight then, the bank and when. */
export type ReleasedFish = { species: string; weight: number; spot: SpotId; at: number };

/** A let-go fish come back to the line, grown since. */
export type Recaught = { species: FishSpecies; weight: number; was: number; at: number };

const dayOf = (ms: number) => new Date(ms).toDateString();

export function loadReleased(): ReleasedFish[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RELEASED_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (one): one is ReleasedFish =>
        !!one && typeof one.species === "string" && typeof one.weight === "number" && typeof one.spot === "string" && typeof one.at === "number",
    );
  } catch {
    return [];
  }
}

export function saveReleased(list: readonly ReleasedFish[]) {
  try {
    localStorage.setItem(RELEASED_KEY, JSON.stringify(list.slice(0, RELEASED_KEEP)));
  } catch {
    // A full or blocked store only means the lake forgets the fish.
  }
}

/** Remember a fish let go from the card; small common fish are never remembered, as with the one that got away. */
export function rememberReleased(species: FishSpecies, weight: number, spot: SpotId, now = Date.now()) {
  if (species.rarity === "common") return;
  saveReleased([{ species: species.id, weight, spot, at: now }, ...loadReleased()]);
}

/** Its weight after the days back in the lake, rounded to the hundredth. */
export function grownWeight(species: FishSpecies, weight: number, days: number) {
  const grown = weight * (1 + Math.min(RECAPTURE_GROWTH_CAP, (RECAPTURE_GROWTH_WEEK * days) / 7));
  return Math.round(Math.min(species.maxWeight, Math.max(weight, grown)) * 100) / 100;
}

/** Whether this cast brings up a fish let go at this bank on an earlier day, and what the lake still remembers after it. */
export function castForReleased(list: readonly ReleasedFish[], spot: SpotId, now: number, roll: number): { fish: Recaught | null; next: readonly ReleasedFish[] } {
  const back = list.find((one) => one.spot === spot && dayOf(one.at) !== dayOf(now) && FISH.some((fish) => fish.id === one.species));
  if (!back || roll >= RECAPTURE_ODDS) return { fish: null, next: list };
  const species = FISH.find((fish) => fish.id === back.species)!;
  const days = Math.max(1, Math.round((now - back.at) / DAY_MS));
  return { fish: { species, weight: grownWeight(species, back.weight, days), was: back.weight, at: back.at }, next: list.filter((one) => one !== back) };
}
