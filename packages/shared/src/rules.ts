import { fishById } from "./fish.ts";
import { anglerLevel, canUseSpot, MAX_SKILL, skillCost } from "./progression.ts";
import type { CatchRequest, FishSpecies, Profile, SkillId, SpotId } from "./types.ts";

export function catchPoints(species: FishSpecies, weight: number, clean = false): number {
  const mid = (species.minWeight + species.maxWeight) / 2;
  const points = species.basePoints * (weight / mid) * (clean ? 1.5 : 1);
  return Math.max(1, Math.round(points));
}

export function weightInRange(species: FishSpecies, weight: number): boolean {
  return weight >= species.minWeight && weight <= species.maxWeight;
}

export function canLand(profile: Pick<Profile, "strength" | "accuracy">, species: FishSpecies): boolean {
  return profile.strength >= species.minStrength && profile.accuracy >= species.minAccuracy;
}

export function legendaryCanBite(
  profile: Pick<Profile, "strength" | "accuracy">,
  species: FishSpecies,
  spot: SpotId,
): boolean {
  if (species.rarity !== "legendary") return true;
  return canLand(profile, species) && species.spots.includes(spot);
}

export type CatchOk = { ok: true; points: number; species: FishSpecies };
export type CatchErr = { ok: false; error: string; status: 400 | 409 };
export type CatchResult = CatchOk | CatchErr;

export function validateCatch(profile: Profile, request: CatchRequest): CatchResult {
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
  return { ok: true, points: catchPoints(species, request.weight, request.clean), species };
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

export function rollWeight(species: FishSpecies, patience: number, random = Math.random): number {
  const t = Math.min(1, Math.max(0, random() + patience * 0.015));
  const weight = species.minWeight + (species.maxWeight - species.minWeight) * t;
  return Math.round(weight * 10) / 10;
}
