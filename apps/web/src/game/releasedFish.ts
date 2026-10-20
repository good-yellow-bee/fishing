import { canLand, FISH, fishById, isTaggable, LODGE_RECAPTURE_ODDS, RELEASED_GROWTH_CAP, tagWindow, type FishSpecies, type LodgeRelease, type Profile, type SpotId } from "@stillwater/shared";

export const RELEASED_KEY = "stillwater.released.v1";
/** Chance a cast at a bank brings up a fish let go there on an earlier day. */
export const RECAPTURE_ODDS = 0.06;
/** How much a let-go fish grows each week back in the lake. */
export const RECAPTURE_GROWTH_WEEK = 0.04;
/** The most a let-go fish grows, however long it was gone; never past its kind's top weight either. */
export const RECAPTURE_GROWTH_CAP = RELEASED_GROWTH_CAP;
/** The lake remembers this many let-go fish, the newest first. */
export const RELEASED_KEEP = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A fish let go from the lake: its kind's id, its weight then, the bank and when, and the lure it was caught on, which it shies from after. */
export type ReleasedFish = { species: string; weight: number; spot: SpotId; at: number; lure?: string };

/** A let-go fish come back to the line, grown since; one another angler let go carries their name and its catch's id as a tag. */
export type Recaught = { species: FishSpecies; weight: number; was: number; at: number; tag?: { id: string; by: string }; giant?: string; foe?: { lure?: string } };

const dayOf = (ms: number) => new Date(ms).toDateString();

export function loadReleased(): ReleasedFish[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RELEASED_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (one): one is ReleasedFish =>
        !!one && typeof one.species === "string" && typeof one.weight === "number" && typeof one.spot === "string" && typeof one.at === "number" && (one.lure === undefined || typeof one.lure === "string"),
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

/** Whether the lake remembers a fish let go; small common fish are never remembered, as with the one that got away. */
export function remembersReleased(species: FishSpecies): boolean {
  return species.rarity !== "common";
}

/** Remember a fish let go from the card. */
export function rememberReleased(species: FishSpecies, weight: number, spot: SpotId, now = Date.now(), lure?: string) {
  if (!remembersReleased(species)) return;
  saveReleased([{ species: species.id, weight, spot, at: now, ...(lure ? { lure } : {}) }, ...loadReleased()]);
}

/** Its weight after the days back in the lake, rounded to the hundredth. */
export function grownWeight(species: FishSpecies, weight: number, days: number) {
  const grown = weight * (1 + Math.min(RECAPTURE_GROWTH_CAP, (RECAPTURE_GROWTH_WEEK * days) / 7));
  return Math.round(Math.min(species.maxWeight, Math.max(weight, grown)) * 100) / 100;
}

/** Whether this cast brings up a fish let go at this bank on an earlier day, one not shy of the tied lure, and what the lake still remembers after it. */
export function castForReleased(list: readonly ReleasedFish[], spot: SpotId, now: number, roll: number, lure?: string): { fish: Recaught | null; next: readonly ReleasedFish[] } {
  const back = list.find((one) => one.spot === spot && dayOf(one.at) !== dayOf(now) && (!lure || one.lure !== lure) && FISH.some((fish) => fish.id === one.species));
  if (!back || roll >= RECAPTURE_ODDS) return { fish: null, next: list };
  const species = FISH.find((fish) => fish.id === back.species)!;
  return { fish: recaughtFrom(species, back.weight, back.at, now), next: list.filter((one) => one !== back) };
}

/** A fish let go at `at` weighing `was`, back on the line at `now`, grown by the days between. */
function recaughtFrom(species: FishSpecies, was: number, at: number, now: number): Recaught {
  const days = Math.max(1, Math.round((now - at) / DAY_MS));
  return { species, weight: grownWeight(species, was, days), was, at };
}

/** Whether this cast brings up a fish another angler let go at this bank before today (UTC), one this angler's line can hold and not yet landed this visit. */
export function castForLodgeTag(list: readonly LodgeRelease[], spot: SpotId, now: number, roll: number, landed: ReadonlySet<string>, angler: Pick<Profile, "strength" | "accuracy">): Recaught | null {
  const today = tagWindow(new Date(now))[1];
  const back = list.find((one) => {
    const species = fishById(one.speciesId);
    return one.spot === spot && one.at < today && !landed.has(one.catchId) && isTaggable(species) && canLand(angler, species);
  });
  if (!back || roll >= LODGE_RECAPTURE_ODDS) return null;
  return { ...recaughtFrom(fishById(back.speciesId)!, back.weight, Date.parse(back.at), now), tag: { id: back.catchId, by: back.by } };
}
