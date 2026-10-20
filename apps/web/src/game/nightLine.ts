import { canLand, FISH, rollWeight, skyAt, type FishSpecies, type Profile, type Sky, type SpotId } from "@stillwater/shared";
import { bestHourFor } from "./logic";

/** Kept per angler, so another angler on the same browser finds no line of theirs out. */
export function nightLineKey(userId: string) {
  return `stillwater.nightline.${userId}.v1`;
}
/** A night line needs this long out before anything has found the bait. */
export const NIGHT_LINE_SOAK_MS = 6 * 3_600_000;
/** Left out longer than this, the bait is long gone and the line comes in empty. */
export const NIGHT_LINE_STALE_MS = 48 * 3_600_000;
/** Chance a line checked in time holds a fish, by the sky over its night: the night feeders roam on a dark, wet night. */
export const NIGHT_LINE_ODDS: Record<Sky, number> = { rain: 0.85, overcast: 0.75, fog: 0.7, "partly-cloudy": 0.7, clear: 0.55 };

/** The sky over the night a line set at `setAt` stands through: that evening's, or, set in the small hours, the night already under way. */
export function nightSkyFor(setAt: number): Sky {
  const night = new Date(setAt);
  if (night.getHours() < 5) night.setDate(night.getDate() - 1);
  night.setHours(23, 0, 0, 0);
  return skyAt(night);
}

/** A shiner left out on a set line at a bank, and when. */
export type NightLine = { spot: SpotId; setAt: number };

export function loadNightLine(userId: string): NightLine | null {
  try {
    const line = JSON.parse(localStorage.getItem(nightLineKey(userId)) ?? "null") as Partial<NightLine> | null;
    return line && typeof line.spot === "string" && typeof line.setAt === "number" ? { spot: line.spot, setAt: line.setAt } : null;
  } catch {
    return null;
  }
}

export function saveNightLine(userId: string, line: NightLine | null) {
  try {
    if (line) localStorage.setItem(nightLineKey(userId), JSON.stringify(line));
    else localStorage.removeItem(nightLineKey(userId));
  } catch {
    // A blocked store only means the line is forgotten on the next visit.
  }
}

export function nightLineState(line: NightLine, now: number): "soaking" | "ready" | "stale" {
  const out = now - line.setAt;
  return out < NIGHT_LINE_SOAK_MS ? "soaking" : out > NIGHT_LINE_STALE_MS ? "stale" : "ready";
}

/** The bank's night feeders the angler could land, which are what a set line catches there. */
export function nightLineKinds(spot: SpotId, angler: Pick<Profile, "strength" | "accuracy">): FishSpecies[] {
  return FISH.filter((fish) => fish.spots.includes(spot) && fish.rarity !== "legendary" && bestHourFor(fish, spot) === "night" && canLand(angler, fish));
}

/** What a line checked in time holds: one of the bank's night feeders, or nothing. */
export function nightLineCatch(line: NightLine, now: number, angler: Pick<Profile, "strength" | "accuracy" | "patience">, level: number, random: () => number): { species: FishSpecies; weight: number } | null {
  if (nightLineState(line, now) !== "ready" || random() >= NIGHT_LINE_ODDS[nightSkyFor(line.setAt)]) return null;
  const kinds = nightLineKinds(line.spot, angler);
  if (kinds.length === 0) return null;
  const species = kinds[Math.floor(random() * kinds.length)]!;
  return { species, weight: rollWeight(species, angler.patience, random, level) };
}
