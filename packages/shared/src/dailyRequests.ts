import { fishById } from "./fish.ts";
import { SPOT_LABELS } from "./progression.ts";
import { lakeSeason, SEASON_SPECIES, type LakeSeason } from "./season.ts";
import type { SpotId } from "./types.ts";

/** Land `count` of a species, from one bank when `spot` is set, each heavier than `minWeight` lb when set. */
export type DailyRequest = {
  id: string;
  speciesId: string;
  spot?: SpotId;
  minWeight?: number;
  count: number;
  reward: number;
};

export type DailyCatch = { speciesId: string; spot: string; weight: number };

/** Strength 1 fish on open banks, so a new angler can always finish two requests. */
const STARTER_REQUESTS: readonly DailyRequest[] = [
  { id: "shiner-dock", speciesId: "golden-shiner", spot: "dock", count: 3, reward: 15 },
  { id: "shiner-reeds", speciesId: "golden-shiner", spot: "reeds", count: 3, reward: 15 },
  { id: "bluegill-point", speciesId: "bluegill", spot: "point", count: 3, reward: 18 },
  { id: "perch-dock", speciesId: "perch", spot: "dock", count: 2, reward: 18 },
  { id: "perch-reeds", speciesId: "perch", spot: "reeds", count: 2, reward: 18 },
  { id: "bluegill-heavy", speciesId: "bluegill", minWeight: 0.4, count: 1, reward: 20 },
  { id: "perch-heavy", speciesId: "perch", minWeight: 0.9, count: 1, reward: 22 },
];

const STRETCH_REQUESTS: readonly DailyRequest[] = [
  { id: "brook-trout-reeds", speciesId: "brook-trout", spot: "reeds", count: 2, reward: 28 },
  { id: "brook-trout-point", speciesId: "brook-trout", spot: "point", count: 2, reward: 28 },
  { id: "bass-dock", speciesId: "smallmouth-bass", spot: "dock", count: 2, reward: 30 },
  { id: "perch-dropoff", speciesId: "perch", spot: "dropoff", count: 3, reward: 25 },
  { id: "rainbow-heavy", speciesId: "rainbow-trout", minWeight: 2.5, count: 1, reward: 32 },
  { id: "bass-heavy", speciesId: "smallmouth-bass", minWeight: 2.5, count: 1, reward: 32 },
  { id: "catfish-dock", speciesId: "catfish", spot: "dock", count: 1, reward: 35 },
  { id: "carp-heavy", speciesId: "carp", minWeight: 8, count: 1, reward: 40 },
  { id: "crappie-dock", speciesId: "crappie", spot: "dock", count: 2, reward: 26 },
  { id: "whitefish-dropoff", speciesId: "lake-whitefish", spot: "dropoff", count: 2, reward: 30 },
  { id: "burbot-dropoff", speciesId: "burbot", spot: "dropoff", count: 1, reward: 38 },
  { id: "salmon-run", speciesId: "salmon", count: 1, reward: 40 },
];

/** The season of a YYYY-MM-DD board day, read off its month like lakeSeason. */
export function seasonForDay(day: string): LakeSeason {
  const month = Number(day.slice(5, 7)) - 1;
  return lakeSeason(new Date(2000, Number.isInteger(month) && month >= 0 && month < 12 ? month : 0, 15));
}

/**
 * How much the season pulls a stretch request onto the board: squared, so a
 * fish in its run (salmon in fall, 2×) is four times as likely, and a fish
 * sulking out of season (carp in winter) is rarely asked for.
 */
export function stretchWeight(request: DailyRequest, season: LakeSeason): number {
  const lean = SEASON_SPECIES[season][request.speciesId] ?? 1;
  return lean * lean;
}

function seasonalPick(requests: readonly DailyRequest[], season: LakeSeason, random: () => number): DailyRequest {
  const total = requests.reduce((sum, request) => sum + stretchWeight(request, season), 0);
  let roll = random() * total;
  for (const request of requests) {
    roll -= stretchWeight(request, season);
    if (roll < 0) return request;
  }
  return requests[requests.length - 1]!;
}

function daySeed(day: string): number {
  let hash = 2166136261;
  for (const char of day) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32: well mixed even for seeds that differ in a few low bits, as adjacent days do. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Two starter requests and one stretch, seeded by the angler's local YYYY-MM-DD
 * so the board turns over at their midnight. The stretch leans toward fish the
 * season favours, so the board and the lake tell the same story.
 */
export function dailyRequestsForDay(day: string): DailyRequest[] {
  const random = seededRandom(daySeed(day));
  return [...shuffled(STARTER_REQUESTS, random).slice(0, 2), seasonalPick(STRETCH_REQUESTS, seasonForDay(day), random)];
}

export function isDailyRequest(request: DailyRequest): boolean {
  const fish = fishById(request.speciesId);
  if (!fish || request.count < 1) return false;
  if (request.spot && !fish.spots.includes(request.spot)) return false;
  return request.minWeight === undefined || (request.minWeight >= fish.minWeight && request.minWeight < fish.maxWeight);
}

export function dailyRequestProgress(request: DailyRequest, catches: readonly DailyCatch[]): number {
  const matching = catches.filter(
    (row) =>
      row.speciesId === request.speciesId &&
      (!request.spot || row.spot === request.spot) &&
      (request.minWeight === undefined || row.weight > request.minWeight),
  ).length;
  return Math.min(request.count, matching);
}

export function dailyRequestLabel(request: DailyRequest): string {
  const name = fishById(request.speciesId)!.name.toLowerCase();
  const fish = request.count === 1 ? `A ${name}` : `${request.count} × ${name}`;
  const size = request.minWeight === undefined ? "" : ` over ${request.minWeight} lb`;
  const bank = request.spot ? ` at the ${SPOT_LABELS[request.spot]}` : "";
  return `${fish}${size}${bank}`;
}
