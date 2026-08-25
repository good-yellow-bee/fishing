import {
  FISH,
  legendaryCanBite,
  rollWeight,
  type FishSpecies,
  type Profile,
  type SpotId,
} from "@stillwater/shared";

const rarityWeight: Record<FishSpecies["rarity"], number> = {
  common: 1,
  uncommon: 0.42,
  rare: 0.16,
  legendary: 0.05,
};

export function sweetBand(accuracy: number) {
  const width = 0.16 + accuracy * 0.03;
  const center = 0.62;
  return {
    min: Math.max(0.28, center - width / 2),
    max: Math.min(0.9, center + width / 2),
  };
}

export function hookWindowMs(accuracy: number) {
  return 720 + accuracy * 90;
}

export function waitMs(patience: number) {
  const base = 2200 + Math.random() * 3800;
  return Math.max(1100, base * (1 - patience * 0.07));
}

export function pickBite(
  spot: SpotId,
  profile: Profile,
  shortCast: boolean,
  random = Math.random,
): FishSpecies {
  let pool = FISH.filter((fish) => fish.spots.includes(spot));
  if (shortCast) pool = pool.filter((fish) => fish.rarity === "common");
  pool = pool.filter((fish) => fish.rarity !== "legendary" || legendaryCanBite(profile, fish, spot));
  if (pool.length === 0) {
    pool = FISH.filter((fish) => fish.spots.includes(spot) && fish.rarity === "common");
  }
  const weights = pool.map((fish) => rarityWeight[fish.rarity]);
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return pool[i]!;
  }
  return pool[0]!;
}

export function makeCatch(species: FishSpecies, patience: number) {
  return { species, weight: rollWeight(species, patience) };
}

export function difficulty01(species: FishSpecies, weight: number) {
  const span = species.maxWeight - species.minWeight;
  if (span <= 0) return 0.5;
  return Math.min(1, Math.max(0, (weight - species.minWeight) / span));
}
