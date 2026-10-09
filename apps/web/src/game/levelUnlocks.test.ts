import { afterEach, describe, expect, it, vi } from "vitest";
import { canLand, fishById, DAILY_SKIES, LAKE_HOURS, SPOT_IDS, type LakeHour, type Profile, type Sky, type SpotId } from "@stillwater/shared";
import { makeCatch, pickBite, waitMs } from "./logic";

const profile: Profile = { userId: "u1", displayName: "Ash", points: 0, lifetimePoints: 700, strength: 5, accuracy: 3, patience: 1 };
const atSix = { ...profile, lifetimePoints: 1200 };

function draws(current: Profile, spot: SpotId, hour: LakeHour, sky?: Sky, hotspot = false, samples = 9600) {
  return Array.from({ length: samples }, (_, i) => pickBite(spot, current, false, () => (i + 0.5) / samples, hour, "Spoon", sky, hotspot));
}

afterEach(() => vi.restoreAllMocks());

describe("level 6 legendary bonus", () => {
  it("leaves the draw identical below level 6 and on a clear day", () => {
    for (const spot of ["reeds", "dropoff"] as const) {
      for (const [hour, sky] of [["night", "clear"], ["day", "rain"], ["day", "clear"]] as const) {
        const baseline = draws({ ...profile, lifetimePoints: 0 }, spot, hour, sky);
        expect(draws(profile, spot, hour, sky)).toEqual(baseline);
        expect(baseline.some((fish) => fish.rarity === "legendary")).toBe(true);
      }
      expect(draws(atSix, spot, "day", "clear")).toEqual(draws(profile, spot, "day", "clear"));
    }
  });

  it("roughly doubles legendary odds at night or in rain, composing with bubbles", () => {
    for (const spot of ["reeds", "dropoff"] as const) {
      for (const [hour, sky] of [["night", "clear"], ["day", "rain"], ["night", "rain"], ["night", undefined]] as const) {
        for (const hotspot of [false, true]) {
          const count = (current: Profile) => draws(current, spot, hour, sky, hotspot).filter((fish) => fish.rarity === "legendary").length;
          const ratio = count(atSix) / count(profile);
          expect(ratio).toBeGreaterThan(1.6);
          expect(ratio).toBeLessThan(2.05);
        }
      }
    }
  });

  it("preserves the landable share at all banks for anglers with mixed skills", () => {
    for (const skills of [{ strength: 1, accuracy: 1 }, { strength: 5, accuracy: 2 }, { strength: 4, accuracy: 3 }]) {
      for (const spot of SPOT_IDS) {
        for (const hour of LAKE_HOURS) {
          for (const sky of DAILY_SKIES) {
            for (const hotspot of [false, true]) {
              const count = (current: Profile) => draws(current, spot, hour, sky, hotspot, 480).filter((fish) => canLand(current, fish)).length;
              expect(Math.abs(count({ ...atSix, ...skills }) - count({ ...profile, ...skills }))).toBeLessThanOrEqual(2);
            }
          }
        }
      }
    }
  });
});

describe("level 7 bite wait", () => {
  it("cuts waits by 15%, composing with the hotspot before the floor", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    for (const hour of LAKE_HOURS) {
      const base = waitMs(1, hour, false, 6);
      expect(waitMs(1, hour)).toBe(base);
      expect(waitMs(1, hour, false, 7)).toBeCloseTo(base * 0.85);
      expect(waitMs(1, hour, true, 7)).toBeCloseTo(Math.max(1100, base * 0.6 * 0.85));
    }
  });

  it("keeps the 1.1 second floor at both levels, including in bubbles", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    for (const level of [6, 7]) {
      for (const hour of LAKE_HOURS) {
        expect(waitMs(8, hour, true, level)).toBe(1100);
        expect(waitMs(8, hour, false, level)).toBeGreaterThanOrEqual(1100);
      }
    }
  });
});

it("passes the level 8 weight bonus through makeCatch", () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  const fish = fishById("sturgeon")!;
  expect(makeCatch(fish, 1, 8).weight).toBeGreaterThan(makeCatch(fish, 1, 7).weight);
});
