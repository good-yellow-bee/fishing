import { FISH, fishById } from "./fish.ts";
import { weeklyBonus } from "./weeklyFish.ts";
import { GOLDEN_BONUS, isGolden } from "./golden.ts";
import { anglerLevel, canUseSpot, MAX_SKILL, SKILL_LABELS, skillCost } from "./progression.ts";
import { dayRunBonus } from "./streak.ts";
import { masteryBonus } from "./mastery.ts";
import type { CatchRequest, FishSpecies, Profile, SkillId, SpotId } from "./types.ts";

/** `bonus` multiplies the whole catch, e.g. WEEKLY_FISH_BONUS for the fish of the week. */
export function catchPoints(species: FishSpecies, weight: number, clean = false, bonus = 1): number {
  const mid = (species.minWeight + species.maxWeight) / 2;
  const points = species.basePoints * (weight / mid) * (clean ? 1.5 : 1) * bonus;
  return Math.max(1, Math.round(points));
}

/** From the third clean fight landed in a row this session, each clean catch earns this much more on top of the clean bonus. */
export const CLEAN_RUN_FROM = 3;
export const CLEAN_RUN_BONUS = 1.2;

/** The bonus for a run of clean fights: `run` counts this catch and the clean ones landed right before it. */
export function cleanRunBonus(clean: boolean | undefined, run: number | undefined): number {
  return clean && (run ?? 0) >= CLEAN_RUN_FROM ? CLEAN_RUN_BONUS : 1;
}

/** A fish heavier than the angler's own best of its kind earns this much more; the first of a kind beats nothing. */
export const PB_BONUS = 1.25;

/** The bonus for beating your own best of a species: `priorBest` is the heaviest landed before, null or undefined before the first. */
export function personalBestBonus(weight: number, priorBest: number | null | undefined): number {
  return priorBest != null && weight > priorBest ? PB_BONUS : 1;
}

/** A fish that takes the lodge record of its kind from another angler earns this much more, in place of the personal best bonus. */
export const LODGE_RECORD_BONUS = 1.5;

/**
 * The bonus for taking the lodge record from another angler: `othersBest` is the heaviest of the kind any other angler landed,
 * and it only counts while it stands above the angler's own `priorBest`, so beating a record the angler already holds is a personal best.
 */
export function lodgeRecordBonus(weight: number, priorBest: number | null | undefined, othersBest: number | null | undefined): number {
  return othersBest != null && weight > othersBest && othersBest >= (priorBest ?? 0) ? LODGE_RECORD_BONUS : 1;
}

/** The lodge record bonus when the catch takes the record from another angler, else the personal best bonus. */
export function bestBonus(weight: number, priorBest: number | null | undefined, othersBest: number | null | undefined): number {
  const lodge = lodgeRecordBonus(weight, priorBest, othersBest);
  return lodge > 1 ? lodge : personalBestBonus(weight, priorBest);
}

export function weightInRange(species: FishSpecies, weight: number): boolean {
  return weight >= species.minWeight && weight <= species.maxWeight;
}

export function canLand(profile: Pick<Profile, "strength" | "accuracy">, species: FishSpecies): boolean {
  return profile.strength >= species.minStrength && profile.accuracy >= species.minAccuracy;
}

/** The nearest rank of a skill that lets this angler land new species, e.g. "Strength 3: Common carp, Channel catfish". */
export function skillUnlock(profile: Pick<Profile, SkillId>, skill: SkillId): string | null {
  for (let rank = profile[skill] + 1; rank <= MAX_SKILL; rank++) {
    const raised = { ...profile, [skill]: rank };
    const opened = FISH.filter((fish) => !canLand(profile, fish) && canLand(raised, fish));
    if (opened.length > 0) return `${SKILL_LABELS[skill]} ${rank}: ${opened.map((fish) => fish.name).join(", ")}`;
  }
  return null;
}

export function legendaryCanBite(
  profile: Pick<Profile, "strength" | "accuracy">,
  species: FishSpecies,
  spot: SpotId,
): boolean {
  if (species.rarity !== "legendary") return true;
  return canLand(profile, species) && species.spots.includes(spot);
}

/** The catch's local day for the fish of the week, if it lies within a day of the server's own; a day further off can't pick another week's fish. */
function weekDayFor(day: string | undefined, at: Date): string | Date {
  if (!day) return at;
  const off = Math.abs(Date.parse(`${day}T12:00:00.000Z`) - Date.parse(`${at.toISOString().slice(0, 10)}T12:00:00.000Z`));
  return off <= 86_400_000 ? day : at;
}

/** A bonus the server paid on a catch, so the landed card stamps only what it really paid. */
export type BonusId = "golden" | "weekly" | "cleanRun" | "pb" | "lodgeRecord" | "dayRun" | "mastery" | "tag" | "giant" | "found";
export type CatchOk = { ok: true; points: number; species: FishSpecies; bonuses: BonusId[] };
export type CatchErr = { ok: false; error: string; status: 400 | 409 };
export type CatchResult = CatchOk | CatchErr;

/** `at` is when the catch is recorded; the catch's own local day picks the fish of the week when it is within a day of `at`, else `at` does. */
/** `requestId`, when given, rolls for a golden fish. */
/**
 * `priorBest` is the heaviest of this species the angler landed before, for the personal best bonus; `othersBest` the heaviest any other angler landed, for the lodge record bonus;
 * `catchDays` the local days the angler's earlier catches came in on, for the day-run bonus; `priorCaught` how many of the
 * kind the angler had landed, for the master bonus.
 */
export function validateCatch(
  profile: Profile,
  request: CatchRequest & { requestId?: string },
  at: Date = new Date(),
  priorBest: number | null = null,
  othersBest: number | null = null,
  catchDays: readonly string[] = [],
  priorCaught = 0,
): CatchResult {
  const species = fishById(request.speciesId);
  if (!species) return { ok: false, error: "unknown species", status: 400 };
  if (!species.spots.includes(request.spot)) {
    return { ok: false, error: "species not at this spot", status: 400 };
  }
  if (!canUseSpot(request.spot, anglerLevel(profile.lifetimePoints))) {
    return { ok: false, error: "spot locked", status: 400 };
  }
  if (!weightInRange(species, request.weight)) {
    return { ok: false, error: "weight out of range", status: 400 };
  }
  if (!canLand(profile, species)) {
    return { ok: false, error: "line too light for this fish", status: 409 };
  }
  const golden = request.requestId !== undefined && isGolden(request.requestId) ? GOLDEN_BONUS : 1;
  const weekly = weeklyBonus(species.id, weekDayFor(request.day, at));
  const cleanRun = cleanRunBonus(request.clean, request.cleanRun);
  const lodge = lodgeRecordBonus(request.weight, priorBest, othersBest);
  const best = bestBonus(request.weight, priorBest, othersBest);
  const dayRun = dayRunBonus(catchDays, request.day);
  const mastery = masteryBonus(priorCaught);
  const paid: [BonusId, boolean][] = [["golden", golden > 1], ["weekly", weekly > 1], ["cleanRun", cleanRun > 1], ["lodgeRecord", lodge > 1], ["pb", lodge === 1 && personalBestBonus(request.weight, priorBest) > 1], ["dayRun", dayRun > 1], ["mastery", mastery > 1]];
  return { ok: true, points: catchPoints(species, request.weight, request.clean, weekly * golden * cleanRun * best * dayRun * mastery), species, bonuses: paid.filter(([, on]) => on).map(([id]) => id) };
}

export type UpgradeOk = { ok: true; cost: number; nextRank: number };
export type UpgradeErr = { ok: false; error: string; status: 400 | 409 };
export type UpgradeResult = UpgradeOk | UpgradeErr;

export function validateUpgrade(profile: Profile, skill: SkillId): UpgradeResult {
  const current = profile[skill];
  if (current >= MAX_SKILL) return { ok: false, error: "skill already maxed", status: 400 };
  const cost = skillCost(current);
  if (profile.points < cost) return { ok: false, error: "not enough points", status: 409 };
  return { ok: true, cost, nextRank: current + 1 };
}

/** A handful of groundbait from the shack costs this many points; the bag carries at most GROUNDBAIT_CARRY handfuls. */
export const GROUNDBAIT_PRICE = 60;
export const GROUNDBAIT_CARRY = 3;

export type PurchaseOk = { ok: true; cost: number };
export type PurchaseResult = PurchaseOk | UpgradeErr;

/** From this level the shack sells its bait a fifth cheaper. */
export const SHACK_DISCOUNT_LEVEL = 17;

/** What a shack item costs this angler: its price, or a fifth off it from SHACK_DISCOUNT_LEVEL. */
export function shackPrice(price: number, lifetimePoints: number): number {
  return anglerLevel(lifetimePoints) >= SHACK_DISCOUNT_LEVEL ? Math.round(price * 0.8) : price;
}

function shackSale(profile: Profile, price: number): PurchaseResult {
  const cost = shackPrice(price, profile.lifetimePoints);
  if (profile.points < cost) return { ok: false, error: "not enough points", status: 409 };
  return { ok: true, cost };
}

export function validateGroundbaitBuy(profile: Profile): PurchaseResult {
  return shackSale(profile, GROUNDBAIT_PRICE);
}

/** A live shiner from the shack's bucket costs this many points; it goes on the hook for one cast, one at a time. */
export const SHINER_PRICE = 50;

export function validateShinerBuy(profile: Profile): PurchaseResult {
  return shackSale(profile, SHINER_PRICE);
}

/** A worm from the shack costs this many points; it goes in the worm tin, for rebaiting or a night line. */
export const WORM_PRICE = 15;

export function validateWormBuy(profile: Profile): PurchaseResult {
  return shackSale(profile, WORM_PRICE);
}

/** The aerator for the bait bucket costs this many points, bought once; it keeps every spare shiner alive a day longer. */
export const AERATOR_PRICE = 150;

export function validateAeratorBuy(profile: Profile): PurchaseResult {
  if (profile.aerator) return { ok: false, error: "aerator already fitted", status: 409 };
  return shackSale(profile, AERATOR_PRICE);
}

export function rollWeight(species: FishSpecies, patience: number, random = Math.random, level = 1): number {
  const trophyBoost = level >= 8 ? 0.1 : 0;
  const t = Math.min(1, Math.max(0, random() + patience * 0.015 + trophyBoost));
  const weight = species.minWeight + (species.maxWeight - species.minWeight) * t;
  return Math.round(weight * 10) / 10;
}
