import { describe, expect, it } from "vitest";
import { closeSpecies, farPastBest } from "./suggestions";

describe("closeSpecies", () => {
  const names = ["Northern pike", "Walleye", "Yellow perch", "Bluegill"];

  it("offers the name a slip was meant to be", () => {
    expect(closeSpecies("Nothern pike", names)).toBe("Northern pike");
    expect(closeSpecies("walleey", names)).toBeNull();
    expect(closeSpecies("Waleye", names)).toBe("Walleye");
  });

  it("stays quiet for a known name, a short one, or nothing close", () => {
    expect(closeSpecies("walleye", names)).toBeNull();
    expect(closeSpecies("Pik", names)).toBeNull();
    expect(closeSpecies("Rainbow trout", names)).toBeNull();
    expect(closeSpecies("Jig 9g", ["Jig 5g", "Spoon"])).toBeNull();
  });
});

describe("farPastBest", () => {
  const longest = { id: "a", species: "Pike", measure: { kind: "length", inches: 30 } } as never;

  it("gives the best when a size is more than twice it", () => {
    expect(farPastBest({ longest, heaviest: null }, "length", 61)).toEqual({ kind: "length", inches: 30 });
    expect(farPastBest({ longest, heaviest: null }, "length", 59)).toBeNull();
    expect(farPastBest({ longest, heaviest: null }, "weight", 99)).toBeNull();
    const heaviest = { id: "b", species: "Walleye", measure: { kind: "weight", pounds: 1.4 } } as never;
    expect(farPastBest({ longest: null, heaviest }, "weight", 3)).toBeNull();
    expect(farPastBest({ longest: null, heaviest }, "weight", 6)).toEqual({ kind: "weight", pounds: 1.4 });
  });
});
