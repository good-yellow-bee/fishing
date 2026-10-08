import { afterEach, describe, expect, it, vi } from "vitest";
import { canLand, DAILY_SKIES, LAKE_HOURS, type FishSpecies, type LakeHour, type Profile, type Sky, type SpotId } from "@stillwater/shared";
import { pickBite, waitMs } from "./logic";

const starter: Profile = {
  userId: "u1",
  displayName: "Ash",
  points: 0,
  lifetimePoints: 0,
  strength: 1,
  accuracy: 1,
  patience: 1,
};

/** Lands everything, so legendaries bite too. */
const strong: Profile = { ...starter, strength: 5, accuracy: 3 };
const BANKS = ["dock", "reeds", "dropoff", "point"] as const;

function bites(spot: SpotId, profile: Profile, hour: LakeHour, lure: string | undefined, sky: Sky | undefined, hotspot: boolean, samples = 480) {
  return Array.from({ length: samples }, (_, i) => pickBite(spot, profile, false, () => i / samples, hour, lure, sky, hotspot));
}

function share(fish: FishSpecies[], keep: (fish: FishSpecies) => boolean) {
  return fish.filter(keep).length / fish.length;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bubbling hotspot bite", () => {
  it("draws rarer fish in the bubbles for an angler who can land them", () => {
    for (const spot of BANKS) {
      for (const hour of LAKE_HOURS) {
        const calm = bites(spot, strong, hour, undefined, undefined, false);
        const bubbles = bites(spot, strong, hour, undefined, undefined, true);
        const where = `${spot} ${hour}`;
        expect(share(bubbles, (fish) => fish.rarity === "common"), where).toBeLessThan(share(calm, (fish) => fish.rarity === "common"));
        if (spot !== "dock") {
          const rare = (fish: FishSpecies) => fish.rarity === "rare" || fish.rarity === "legendary";
          expect(share(bubbles, rare), where).toBeGreaterThan(share(calm, rare));
        }
      }
    }
  });

  it("never lifts a legendary less than a rare", () => {
    for (const [spot, legendary, rare, lure] of [
      ["reeds", "tiger-muskie", "pike", "Spoon"],
      ["dropoff", "sturgeon", "salmon", "Spoon"],
    ] as const) {
      const ratio = (hotspot: boolean) => {
        const drawn = bites(spot, strong, "day", lure, undefined, hotspot, 9600);
        return drawn.filter((fish) => fish.id === legendary).length / drawn.filter((fish) => fish.id === rare).length;
      };
      expect(ratio(false), spot).toBeGreaterThan(0);
      // Sampled draws, so allow a hair under an exact tie.
      expect(ratio(true), spot).toBeGreaterThanOrEqual(ratio(false) * 0.98);
    }
  });

  it("changes which fish bite but not how many of them the angler can land", () => {
    for (const profile of [starter, { ...starter, strength: 2 }, { ...starter, strength: 3, accuracy: 2 }]) {
      for (const spot of BANKS) {
        for (const hour of LAKE_HOURS) {
          for (const lure of ["Spinnerbait", "Nightcrawlers"]) {
            for (const sky of [undefined, ...DAILY_SKIES]) {
              const where = `${sky} ${spot} ${hour} ${lure} str ${profile.strength} acc ${profile.accuracy}`;
              const landable = (hotspot: boolean) => share(bites(spot, profile, hour, lure, sky, hotspot), (fish) => canLand(profile, fish));
              expect(Math.abs(landable(true) - landable(false)), where).toBeLessThanOrEqual(2 / 480);
            }
          }
        }
      }
    }
  });

  it("brings the bite sooner in the bubbles, still after the nibble", () => {
    for (const roll of [0, 0.5, 0.999]) {
      vi.spyOn(Math, "random").mockReturnValue(roll);
      for (const hour of LAKE_HOURS) {
        for (let patience = 0; patience <= 8; patience += 1) {
          const calm = waitMs(patience, hour);
          const bubbles = waitMs(patience, hour, true);
          const where = `${roll} ${hour} patience ${patience}`;
          expect(bubbles, where).toBeLessThanOrEqual(calm);
          expect(bubbles, where).toBeGreaterThanOrEqual(1100);
          if (calm * 0.6 > 1100) expect(bubbles, where).toBeCloseTo(calm * 0.6, 6);
        }
      }
    }
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(waitMs(1, "day", true)).toBeLessThan(waitMs(1, "day"));
  });
});
