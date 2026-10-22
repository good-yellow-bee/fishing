import { canLand, FISH, rollWeight, skyAt, type FishSpecies, type LakeSeason, type Profile, type Sky, type SpotId } from "@stillwater/shared";
import { afterDark, bestHourFor } from "./logic";

/** Kept per angler, so another angler on the same browser finds no line of theirs out. */
export function nightLineKey(userId: string) {
  return `stillwater.nightline.${userId}.v1`;
}
/** A night line fishes through a night, and needs at least this long out before anything has found the bait. */
export const NIGHT_LINE_SOAK_MS = 6 * 3_600_000;
/** The clock hour the night is out, as the lake's dawn begins. */
const NIGHT_ENDS_HOUR = 5;
/** Left out longer than this, the bait is long gone and the line comes in empty. */
export const NIGHT_LINE_STALE_MS = 48 * 3_600_000;
/** Summer's quick feeders find the bait within three hours, but crayfish strip it within a day. */
export const NIGHT_LINE_HOT_SOAK_MS = 3 * 3_600_000;
export const NIGHT_LINE_HOT_STALE_MS = 24 * 3_600_000;
/** Winter's slow fish need twelve hours to find it, but the bait keeps four days in the cold. */
export const NIGHT_LINE_COLD_SOAK_MS = 12 * 3_600_000;
export const NIGHT_LINE_COLD_STALE_MS = 96 * 3_600_000;
/** However early it goes stale, a line still holds its bait till the evening after the night it stood through. */
export const NIGHT_LINE_DAY_MS = 15 * 3_600_000;
/** Chance a line checked in time holds a fish, by the sky over its night: the night feeders roam on a dark, wet night. */
export const NIGHT_LINE_ODDS: Record<Sky, number> = { rain: 0.85, overcast: 0.75, fog: 0.7, "partly-cloudy": 0.7, clear: 0.55 };

/** The sky over the night a line set at `setAt` stands through: that evening's, or, set in the small hours, the night already under way. */
export function nightSkyFor(setAt: number): Sky {
  const night = new Date(setAt);
  if (night.getHours() < NIGHT_ENDS_HOUR) night.setDate(night.getDate() - 1);
  night.setHours(23, 0, 0, 0);
  return skyAt(night);
}

/** A worm on a night line draws this share of a shiner's odds: free, but the night feeders come to it less. */
export const WORM_LINE_ODDS = 0.6;

/** A worm goes out on a line as the light goes, at dusk or night; a bought or landed shiner may go out any time. */
export function wormLineHour(hour: string): boolean {
  return afterDark(hour);
}

/** A bait left out on a set line at a bank, and when; lines from before worms were left out carry a shiner. season: set in summer or winter, fixed when it goes out. */
export type NightLine = { spot: SpotId; setAt: number; bait?: "shiner" | "worm"; season?: "summer" | "winter" };

/** The season a line set now keeps: only summer and winter change its timing. */
export function nightLineSeason(season: LakeSeason | undefined): NightLine["season"] {
  return season === "summer" || season === "winter" ? season : undefined;
}

/** How long a line soaks before it can come in, and when its bait is gone, by the season it was set in. */
export function nightLineTimes(season: NightLine["season"]): { soakMs: number; staleMs: number } {
  if (season === "summer") return { soakMs: NIGHT_LINE_HOT_SOAK_MS, staleMs: NIGHT_LINE_HOT_STALE_MS };
  if (season === "winter") return { soakMs: NIGHT_LINE_COLD_SOAK_MS, staleMs: NIGHT_LINE_COLD_STALE_MS };
  return { soakMs: NIGHT_LINE_SOAK_MS, staleMs: NIGHT_LINE_STALE_MS };
}

export function loadNightLine(userId: string): NightLine | null {
  try {
    const line = JSON.parse(localStorage.getItem(nightLineKey(userId)) ?? "null") as Partial<NightLine> | null;
    const season = nightLineSeason(line?.season);
    return line && typeof line.spot === "string" && typeof line.setAt === "number" ? { spot: line.spot, setAt: line.setAt, ...(line.bait === "worm" ? { bait: "worm" as const } : {}), ...(season ? { season } : {}) } : null;
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

/** When a line can come in: once the night it stands through is out, and never before it has soaked its season's hours. */
export function nightLineReadyAt(setAt: number, soakMs = NIGHT_LINE_SOAK_MS): number {
  const dawn = new Date(setAt);
  if (dawn.getHours() >= NIGHT_ENDS_HOUR) dawn.setDate(dawn.getDate() + 1);
  dawn.setHours(NIGHT_ENDS_HOUR, 0, 0, 0);
  return Math.max(dawn.getTime(), setAt + soakMs);
}

/** When a line turns ready, and the first instant it is stale. */
function nightLineTurns(line: NightLine): { ready: number; stale: number } {
  const { soakMs, staleMs } = nightLineTimes(line.season);
  const ready = nightLineReadyAt(line.setAt, soakMs);
  return { ready, stale: Math.max(line.setAt + staleMs, ready + NIGHT_LINE_DAY_MS) + 1 };
}

export function nightLineState(line: NightLine, now: number): "soaking" | "ready" | "stale" {
  const { ready, stale } = nightLineTurns(line);
  return now < ready ? "soaking" : now >= stale ? "stale" : "ready";
}

/** When a line next changes state: as it turns ready, then as it goes stale, then never again. */
export function nightLineNextChange(line: NightLine, now: number): number | null {
  const { ready, stale } = nightLineTurns(line);
  return now < ready ? ready : now < stale ? stale : null;
}

/** The bank's night feeders the angler could land, which are what a set line catches there. */
export function nightLineKinds(spot: SpotId, angler: Pick<Profile, "strength" | "accuracy">): FishSpecies[] {
  return FISH.filter((fish) => fish.spots.includes(spot) && fish.rarity !== "legendary" && bestHourFor(fish, spot) === "night" && canLand(angler, fish));
}

/** What a line checked in time holds: one of the bank's night feeders, or nothing. */
export function nightLineCatch(line: NightLine, now: number, angler: Pick<Profile, "strength" | "accuracy" | "patience">, level: number, random: () => number): { species: FishSpecies; weight: number } | null {
  if (nightLineState(line, now) !== "ready" || random() >= NIGHT_LINE_ODDS[nightSkyFor(line.setAt)] * (line.bait === "worm" ? WORM_LINE_ODDS : 1)) return null;
  const kinds = nightLineKinds(line.spot, angler);
  if (kinds.length === 0) return null;
  const species = kinds[Math.floor(random() * kinds.length)]!;
  return { species, weight: rollWeight(species, angler.patience, random, level) };
}
