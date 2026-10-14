import { describe, expect, it } from "vitest";
import { canLand, LAKE_SEASONS, type LakeHour, type LakeSeason, type Profile, type SpotId } from "@stillwater/shared";
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
/** Lands everything but legendaries. */
const seasoned: Profile = { ...starter, strength: 4, accuracy: 3, lifetimePoints: 5000 };
const HOURS = ["dawn", "day", "dusk", "night"] as const;
const BANKS = ["dock", "reeds", "dropoff", "point", "inlet", "open"] as const;

function bites(spot: SpotId, profile: Profile, hour: LakeHour, lure: string, season: LakeSeason | undefined, samples = 480) {
  return Array.from({ length: samples }, (_, i) =>
    pickBite(spot, profile, false, () => i / samples, hour, lure, undefined, false, false, season),
  );
}

function share(spot: SpotId, id: string, season: LakeSeason | undefined, hour: LakeHour = "dawn", lure = "Spoon") {
  return bites(spot, seasoned, hour, lure, season).filter((fish) => fish.id === id).length / 480;
}

describe("bites by season", () => {
  it("runs salmon in fall and brings burbot up in winter", () => {
    const fallSalmon = share("open", "salmon", "fall");
    for (const season of LAKE_SEASONS) if (season !== "fall") expect(fallSalmon).toBeGreaterThan(share("open", "salmon", season));
    const winterBurbot = share("dropoff", "burbot", "winter", "night", "Spoon");
    expect(winterBurbot).toBeGreaterThan(share("dropoff", "burbot", "summer", "night", "Spoon"));
  });

  it("changes which fish bite but not how many of them the angler can land", () => {
    for (const profile of [starter, { ...starter, strength: 2 }, { ...starter, strength: 3, accuracy: 2 }]) {
      for (const spot of BANKS) {
        for (const hour of HOURS) {
          for (const lure of ["Spinnerbait", "Nightcrawlers"]) {
            const landable = (season: LakeSeason | undefined) =>
              bites(spot, profile, hour, lure, season, 240).filter((fish) => canLand(profile, fish)).length / 240;
            const plain = landable(undefined);
            for (const season of LAKE_SEASONS) {
              expect(Math.abs(landable(season) - plain), `${season} ${spot} ${hour} ${lure} str ${profile.strength}`).toBeLessThanOrEqual(2 / 240);
            }
          }
        }
      }
    }
  });

  it("never takes a bank's fish away for a season", () => {
    for (const spot of BANKS) {
      const year = new Set(bites(spot, seasoned, "dusk", "Spinnerbait", undefined, 960).map((fish) => fish.id));
      for (const season of LAKE_SEASONS) {
        const seen = new Set(bites(spot, seasoned, "dusk", "Spinnerbait", season, 960).map((fish) => fish.id));
        expect([...seen].sort(), `${spot} ${season}`).toEqual([...year].sort());
      }
    }
  });
});
