import type { FishSpecies } from "@stillwater/shared";
import { difficulty01 } from "../logic";

export function challengeScale(species: FishSpecies, weight: number, accuracy: number, strength: number) {
  const t = difficulty01(species, weight);
  return {
    t,
    mashClicks: Math.round(8 + t * 10),
    mashMs: Math.round(3400 - t * 1100),
    timingHits: 2 + Math.floor(t * 2),
    timingZone: Math.max(0.08, 0.22 - t * 0.1 + accuracy * 0.015),
    tensionFailMs: Math.max(280, 900 - t * 400 + strength * 40),
    sequenceLen: 3 + Math.floor(t * 3),
    sequenceMs: Math.round(1500 - t * 400),
  };
}
