import { describe, expect, it } from "vitest";
import { canLand, LAKE_HOURS, luresPacked, SPOT_IDS, type Profile, type SpotId } from "@stillwater/shared";
import { pickBite } from "./logic";
import { defaultLure, lureBlurb, lureCanChange, smallLuresFirst } from "./lureChoice";

describe("lure choice", () => {
  it("can change while standing and stays tied once the cast is away", () => {
    expect(lureCanChange("idle")).toBe(true);
    expect(lureCanChange("casting")).toBe(true);
    expect(lureCanChange("waiting")).toBe(false);
    expect(lureCanChange("hookset")).toBe(false);
    expect(lureCanChange("fight")).toBe(false);
    expect(lureCanChange("result")).toBe(false);
  });

  it("starts a light line on the first small lure and a strong one on the first packed", () => {
    const sample = luresPacked(null);
    expect(sample[0]).toBe("Spinnerbait");
    expect(defaultLure(sample, 1)).toBe("Pheasant tails");
    expect(defaultLure(sample, 2)).toBe("Pheasant tails");
    expect(defaultLure(sample, 3)).toBe("Spinnerbait");
    expect(defaultLure(["Spinnerbait", "#5 Mepps"], 1)).toBe("Spinnerbait");
    expect(defaultLure([], 1)).toBe("Bobber");
  });

  it("lists small lures first, keeping packed order within each size", () => {
    expect(smallLuresFirst(["Spinnerbait", "Popper", "#5 Mepps", "Nightcrawlers"])).toEqual([
      "Popper",
      "Nightcrawlers",
      "Spinnerbait",
      "#5 Mepps",
    ]);
  });

  it("says what the tied lure draws, and what a small lure still needs on this bank", () => {
    expect(lureBlurb("Popper", "dock")).toBe("Small lure — lighter fish (some here need Strength 2)");
    expect(lureBlurb("Popper", "reeds")).toBe("Small lure — lighter fish (some here need Strength 2)");
    expect(lureBlurb("Pheasant tails", "point")).toBe("Small lure — lighter fish (some here need Strength 2)");
    expect(lureBlurb("Popper", "dropoff")).toBe("Small lure — lighter fish (some here need Strength 3)");
    expect(lureBlurb("Spinnerbait", "reeds")).toBe("Big lure — heavier fish (Strength 3+ to land most)");
  });

  it("names the Strength a small lure's bites really need on every bank", () => {
    // Accuracy 5 so only Strength decides what lands.
    const angler = (strength: number): Profile => ({
      userId: "u1",
      displayName: "Ash",
      points: 0,
      lifetimePoints: 0,
      strength,
      accuracy: 5,
      patience: 1,
    });
    const snaps = (spot: SpotId, strength: number) =>
      LAKE_HOURS.some((hour) =>
        Array.from({ length: 480 }, (_, i) => pickBite(spot, angler(strength), false, () => i / 480, hour, "Popper")).some(
          (fish) => !canLand(angler(strength), fish),
        ),
      );
    for (const spot of SPOT_IDS) {
      const need = Number(lureBlurb("Popper", spot).match(/Strength (\d)/)![1]);
      expect(snaps(spot, need - 1)).toBe(true);
      expect(snaps(spot, need)).toBe(false);
    }
  });
});
