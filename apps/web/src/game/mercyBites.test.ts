import { describe, expect, it, vi } from "vitest";
import { canLand, FISH, LAKE_HOURS, type Profile, type SpotId } from "@stillwater/shared";
import { hookWindowMs, isMercy, MERCY_WAIT_MAX_MS, pickBite, waitMs } from "./logic";

const starter: Profile = {
  userId: "u1",
  displayName: "Ash",
  points: 0,
  lifetimePoints: 0,
  strength: 1,
  accuracy: 1,
  patience: 1,
};

const SPOTS: SpotId[] = ["dock", "reeds", "point", "dropoff"];
const LURES = [undefined, "Pheasant tails", "Spinnerbait", "Crankbait", "Nightcrawler"];

describe("mercy bites", () => {
  it("is on for the first three fish only", () => {
    expect([0, 1, 2, 3, 10].map(isMercy)).toEqual([true, true, true, false, false]);
  });

  it("only ever hooks a common the angler can land, on every bank, lure and hour", () => {
    for (const spot of SPOTS) {
      for (const lure of LURES) {
        for (const hour of LAKE_HOURS) {
          for (let i = 0; i < 40; i++) {
            const fish = pickBite(spot, starter, false, () => i / 40, hour, lure, "rain", true, true);
            expect(fish.rarity, `${spot} ${lure} ${hour}`).toBe("common");
            expect(canLand(starter, fish), `${fish.id} ${spot} ${lure}`).toBe(true);
            expect(fish.spots).toContain(spot);
          }
        }
      }
    }
  });

  it("can still draw a fish the angler cannot land once the mercy is over", () => {
    const outOfReach = FISH.filter((fish) => fish.spots.includes("dock") && !canLand(starter, fish));
    expect(outOfReach.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) ids.add(pickBite("dock", starter, false, () => i / 200, "day", "Crankbait").id);
    expect(outOfReach.some((fish) => ids.has(fish.id))).toBe(true);
  });

  it("brings the bite sooner and leaves longer to strike", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    for (const hour of LAKE_HOURS) {
      expect(waitMs(1, hour, false, 1, true)).toBeLessThanOrEqual(MERCY_WAIT_MAX_MS);
      expect(waitMs(1, hour, false, 1, false)).toBeGreaterThan(MERCY_WAIT_MAX_MS);
    }
    vi.restoreAllMocks();
    expect(hookWindowMs(1, true)).toBe(hookWindowMs(1) + 400);
  });
});
