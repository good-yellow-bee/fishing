import { describe, expect, it } from "vitest";
import { canLand, type LakeHour, type Profile, type SpotId } from "@stillwater/shared";
import { pickBite } from "./logic";

const starter: Profile = { userId: "u1", displayName: "Ash", points: 0, lifetimePoints: 0, strength: 1, accuracy: 1, patience: 1 };
/** Lands everything but legendaries. */
const seasoned: Profile = { ...starter, strength: 4, accuracy: 3, lifetimePoints: 5000 };
const BANKS = ["dock", "reeds", "dropoff", "point", "inlet", "open"] as const;

function bites(spot: SpotId, profile: Profile, hour: LakeHour, moon: number | undefined, samples = 960) {
  return Array.from({ length: samples }, (_, i) =>
    pickBite(spot, profile, false, () => i / samples, hour, "Spoon", undefined, false, false, undefined, moon),
  );
}

const rareShare = (spot: SpotId, hour: LakeHour, moon: number | undefined) =>
  bites(spot, seasoned, hour, moon).filter((fish) => fish.rarity === "rare" || fish.rarity === "legendary").length / 960;

describe("bites by the moon", () => {
  it("brings rare fish up a little on a full-moon night, and not by day or at new moon", () => {
    const lifted = BANKS.filter((spot) => rareShare(spot, "night", 1) > rareShare(spot, "night", 0));
    expect(lifted.length).toBeGreaterThan(0);
    for (const spot of BANKS) {
      expect(rareShare(spot, "night", 1)).toBeGreaterThanOrEqual(rareShare(spot, "night", 0));
      expect(rareShare(spot, "day", 1)).toBe(rareShare(spot, "day", 0));
      expect(rareShare(spot, "night", 0)).toBe(rareShare(spot, "night", undefined));
    }
  });

  it("never moves how many of the bites the angler can land", () => {
    for (const profile of [starter, { ...starter, strength: 2 }]) {
      for (const spot of BANKS) {
        const landable = (moon: number | undefined) => bites(spot, profile, "night", moon, 480).filter((fish) => canLand(profile, fish)).length / 480;
        expect(Math.abs(landable(1) - landable(undefined)), spot).toBeLessThanOrEqual(2 / 480);
      }
    }
  });
});
