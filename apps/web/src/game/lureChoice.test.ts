import { describe, expect, it } from "vitest";
import { canLand, LAKE_HOURS, luresPacked, SPOT_IDS, type Profile, type SpotId } from "@stillwater/shared";
import { pickBite } from "./logic";
import { defaultLure, lureBlurb, lureCanChange, nextLure, smallLuresFirst, suitsBank, suitsNow, type LureConditions } from "./lureChoice";

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
    expect(lureBlurb("Popper", "reeds")).toBe("Small lure — lighter fish (some here need Strength 4)");
    expect(lureBlurb("Pheasant tails", "point")).toBe("Small lure — lighter fish (some here need Strength 2)");
    expect(lureBlurb("Popper", "dropoff")).toBe("Small lure — lighter fish (some here need Strength 4)");
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

describe("nextLure", () => {
  it("steps through the picker's order and wraps round both ways", () => {
    const packed = luresPacked([]);
    const order = smallLuresFirst(packed);
    expect(order.length).toBeGreaterThan(1);
    expect(nextLure(packed, order[0]!, 1)).toBe(order[1]);
    expect(nextLure(packed, order[0]!, -1)).toBe(order.at(-1));
    expect(nextLure(packed, order.at(-1)!, 1)).toBe(order[0]);
  });

  it("keeps the lure when nothing else is packed, and starts the order for one that is not", () => {
    expect(nextLure([], "Spinner", 1)).toBe("Spinner");
    expect(nextLure(["Worm", "Spinner"], "Gone", 1)).toBe(smallLuresFirst(["Worm", "Spinner"])[0]);
  });
});

describe("suitsBank", () => {
  it.each([
    ["#5 Mepps", "reeds", true],
    ["#5 Mepps", "inlet", true],
    ["#5 Mepps", "dock", false],
    ["Nightcrawler", "dock", true],
    ["Shad crank", "point", true],
    ["Green pumpkin tube", "dropoff", true],
    ["Bobber", "reeds", true],
    ["Popper", "reeds", false],
  ] as const)("says whether %s suits the %s", (lure, spot, suits) => {
    expect(suitsBank(lure, spot)).toBe(suits);
  });
});

describe("suitsNow", () => {
  const plain: LureConditions = { sky: "partly-cloudy", hour: "day", season: "spring", wind: "light-north", moon: 0.5, rising: false };
  it.each([
    ["#5 Mepps", { sky: "clear" }, true],
    ["#5 Mepps", { sky: "rain" }, true],
    ["Kastmaster", { sky: "clear", hour: "night", moon: 1 }, true],
    ["Kastmaster", { sky: "clear", hour: "night", moon: 0.5 }, false],
    ["Nightcrawler", { hour: "night" }, true],
    ["Popper", { hour: "night" }, true],
    ["Popper", { hour: "night", wind: "strong" }, false],
    ["Popper", { wind: "calm" }, true],
    ["Pheasant tails", { rising: true }, true],
    ["Green pumpkin tube", { season: "winter" }, true],
    ["Spinnerbait", { season: "fall" }, true],
    ["Nightcrawler", { wind: "breezy" }, false],
    ["#5 Mepps", {}, false],
  ] as const)("says whether %s suits %o", (lure, change, suits) => {
    expect(suitsNow(lure, { ...plain, ...change })).toBe(suits);
  });
});
