export type ChallengeId = "mash" | "timing" | "tension" | "sequence" | "surge";
export type SpotId = "dock" | "reeds" | "dropoff";
export type SkillId = "strength" | "accuracy" | "patience";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type FishSpecies = {
  id: string;
  name: string;
  minWeight: number;
  maxWeight: number;
  minStrength: number;
  minAccuracy: number;
  challenge: ChallengeId;
  spots: SpotId[];
  basePoints: number;
  rarity: Rarity;
  color: string;
  accent: string;
};

export type Profile = {
  userId: string;
  displayName: string;
  points: number;
  lifetimePoints: number;
  strength: number;
  accuracy: number;
  patience: number;
};

export type CatchRecord = {
  id: string;
  userId: string;
  speciesId: string;
  weight: number;
  points: number;
  spot: SpotId;
  createdAt: string;
};

export type CatchRequest = {
  speciesId: string;
  weight: number;
  spot: SpotId;
};

export type UpgradeRequest = {
  skill: SkillId;
};
