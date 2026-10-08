import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import { catchStamp, guideClue, isTrophyWeight, shadowSize, trophyWeight } from "./guide.ts";
import { rollWeight } from "./rules.ts";

const species = (id: string) => fishById(id)!;

describe("field guide clues", () => {
  it("marks the top of a species range as trophy size", () => {
    const perch = species("perch");
    expect(trophyWeight(perch)).toBe(1.1);
    expect(isTrophyWeight(perch, 1)).toBe(false);
    expect(isTrophyWeight(perch, 1.1)).toBe(true);
    expect(trophyWeight(species("bluegill"))).toBe(0.6);
    expect(trophyWeight(species("golden-shiner"))).toBe(0.4);
    expect(trophyWeight(species("carp"))).toBe(15.9);
  });

  it("keeps trophies to about the top 15% of rolled weights for every species", () => {
    const samples = 6000;
    for (const fish of FISH) {
      let trophies = 0;
      for (let i = 0; i < samples; i++) {
        if (isTrophyWeight(fish, rollWeight(fish, 0, () => (i + 0.5) / samples))) trophies++;
      }
      const share = trophies / samples;
      expect(share, fish.id).toBeGreaterThan(0.05);
      // One 0.1 lb step is a sixth of a golden shiner's or a perch's rolls, so that is the finest cut possible.
      expect(share, fish.id).toBeLessThanOrEqual(1 / 6 + 1e-9);
    }
  });

  it("stamps a trophy on a first catch and leaves unknown species untouched", () => {
    expect(catchStamp([], "golden-shiner", 0.4)).toEqual({ kind: "first", trophy: true });
    expect(catchStamp([], "golden-shiner", 0.3)).toEqual({ kind: "first", trophy: false });
    expect(catchStamp([], "unknown-fish", 99)).toEqual({ kind: "first", trophy: false });
  });

  it("sizes shadows from the weight range", () => {
    const sizes = Object.fromEntries(FISH.map((fish) => [fish.id, shadowSize(fish)]));
    expect(sizes).toEqual({
      "golden-shiner": "small",
      bluegill: "small",
      perch: "small",
      "brook-trout": "medium",
      "smallmouth-bass": "medium",
      "rainbow-trout": "medium",
      carp: "large",
      pike: "large",
      catfish: "large",
      burbot: "large",
      salmon: "large",
      "tiger-muskie": "huge",
      sturgeon: "huge",
    });
  });

  it("gives unknown fish their banks, best time, and shadow", () => {
    expect(guideClue(species("catfish"))).toEqual({ spots: ["dock", "dropoff"], bestHour: "night", shadow: "large" });
    expect(guideClue(species("brook-trout")).bestHour).toBe("dawn");
    expect(guideClue(species("smallmouth-bass")).bestHour).toBe("dusk");
    expect(guideClue(species("golden-shiner")).bestHour).toBe("day");
  });
});
