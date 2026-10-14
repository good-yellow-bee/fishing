import type { LakeHour } from "./hour.ts";
import type { Sky } from "./weather.ts";

export type ChallengeId = "mash" | "timing" | "tension" | "sequence" | "surge";
export type SpotId = "dock" | "reeds" | "dropoff" | "point" | "inlet" | "open";
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
  silhouette: string;
  lore: string;
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
  /** The lake hour and sky the angler fished under; null on catches saved before they were recorded. */
  hour: LakeHour | null;
  sky: Sky | null;
  createdAt: string;
};

export type CatchRequest = {
  speciesId: string;
  weight: number;
  spot: SpotId;
  clean?: boolean;
  /** Optional so catches queued offline before these were sent still post. */
  hour?: LakeHour;
  sky?: Sky;
};

export type CatchSubmission = CatchRequest & {
  requestId: string;
};

export type UpgradeRequest = {
  skill: SkillId;
};
