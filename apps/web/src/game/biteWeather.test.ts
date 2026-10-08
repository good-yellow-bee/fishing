import { describe, expect, it } from "vitest";
import { canLand, canUseSpot, DAILY_SKIES, type LakeHour, type Profile, type Sky, type SpotId } from "@stillwater/shared";
import { pickBite } from "./logic";

const starter: Profile = {
  userId: "u1",
  displayName: "Ash",
  points: 0,
  lifetimePoints: 0,
  strength: 1,
  accuracy: 1,
  patience: 1,
};

const seasoned: Profile = { ...starter, strength: 4, accuracy: 2 };
/** Lands everything, so legendaries bite too. */
const strong: Profile = { ...starter, strength: 5, accuracy: 3 };
const HOURS = ["dawn", "day", "dusk", "night"] as const;
const BANKS = ["dock", "reeds", "dropoff", "point"] as const;

function bites(spot: SpotId, profile: Profile, hour: LakeHour, lure: string | undefined, sky: Sky | undefined) {
  return Array.from({ length: 480 }, (_, i) => pickBite(spot, profile, false, () => i / 480, hour, lure, sky));
}

function count(spot: SpotId, id: string, sky: Sky, lure?: string) {
  return bites(spot, strong, "day", lure, sky).filter((fish) => fish.id === id).length;
}

function landableShare(spot: SpotId, profile: Profile, hour: LakeHour, lure: string, sky: Sky) {
  return bites(spot, profile, hour, lure, sky).filter((fish) => canLand(profile, fish)).length / 480;
}

describe("bite weather", () => {
  it("draws pike and muskie in rain, trout and bass under cloud, catfish and burbot in fog", () => {
    expect(count("point", "pike", "rain")).toBeGreaterThan(count("point", "pike", "clear"));
    expect(count("reeds", "tiger-muskie", "rain", "Spoon")).toBeGreaterThan(count("reeds", "tiger-muskie", "clear", "Spoon"));
    expect(count("point", "brook-trout", "overcast")).toBeGreaterThan(count("point", "brook-trout", "clear"));
    expect(count("dock", "smallmouth-bass", "overcast")).toBeGreaterThan(count("dock", "smallmouth-bass", "clear"));
    expect(count("dock", "catfish", "fog")).toBeGreaterThan(count("dock", "catfish", "clear"));
    expect(count("dropoff", "burbot", "fog", "Nightcrawlers")).toBeGreaterThan(count("dropoff", "burbot", "clear", "Nightcrawlers"));
  });

  it("leaves the draw untouched when no sky is given", () => {
    for (const spot of BANKS) {
      const none = bites(spot, seasoned, "dusk", "Spinnerbait", undefined).map((fish) => fish.id);
      expect(bites(spot, seasoned, "dusk", "Spinnerbait", "partly-cloudy").map((fish) => fish.id)).toEqual(none);
    }
  });

  it("never locks a starter out of the banks open at level 1, in any weather", () => {
    for (const sky of DAILY_SKIES) {
      for (const spot of BANKS.filter((bank) => canUseSpot(bank, 1))) {
        for (const hour of HOURS) {
          for (const lure of ["Spinnerbait", "Spoon", "Nightcrawlers"]) {
            expect(landableShare(spot, starter, hour, lure, sky), `${sky} ${spot} ${hour} ${lure}`).toBeGreaterThan(0.55);
          }
        }
      }
    }
  });

  it("lands at least as often after every Strength or Accuracy upgrade in any weather", () => {
    for (const sky of DAILY_SKIES) {
      for (const spot of BANKS) {
        for (const hour of HOURS) {
          for (const lure of ["Spinnerbait", "Nightcrawlers"]) {
            for (const accuracy of [1, 2, 3]) {
              let previous = 0;
              for (let strength = 1; strength <= 5; strength++) {
                const share = landableShare(spot, { ...starter, strength, accuracy }, hour, lure, sky);
                expect(share, `${sky} ${spot} ${hour} ${lure} str ${strength} acc ${accuracy}`).toBeGreaterThanOrEqual(previous - 1e-9);
                previous = share;
              }
            }
            for (const strength of [1, 3, 5]) {
              let previous = 0;
              for (let accuracy = 1; accuracy <= 3; accuracy++) {
                const share = landableShare(spot, { ...starter, strength, accuracy }, hour, lure, sky);
                expect(share, `${sky} ${spot} ${hour} ${lure} str ${strength} acc ${accuracy}`).toBeGreaterThanOrEqual(previous - 1e-9);
                previous = share;
              }
            }
          }
        }
      }
    }
  });
});
