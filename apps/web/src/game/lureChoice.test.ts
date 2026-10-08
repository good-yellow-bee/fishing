import { describe, expect, it } from "vitest";
import { luresPacked } from "@stillwater/shared";
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

  it("says what the tied lure draws", () => {
    expect(lureBlurb("Popper")).toBe("Small lure — light fish");
    expect(lureBlurb("Spinnerbait")).toBe("Big lure — heavier fish (Strength 3+ to land most)");
  });
});
