import { describe, expect, it } from "vitest";
import { castForFoe, FOE_DAYS, FOE_ODDS } from "./oldFoe";

const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
const foe = { species: "pike", weight: 19, spot: "reeds" as const, at: at(20, 18), lure: "Mepps spinner" };

describe("the old foe", () => {
  it("comes back only at its bank, on a later day, within its days, on a lucky cast, still carrying the lure", () => {
    expect(castForFoe(foe, "reeds", at(20, 21), 0)).toBeNull();
    expect(castForFoe(foe, "dock", at(21), 0)).toBeNull();
    expect(castForFoe(foe, "reeds", at(21), FOE_ODDS)).toBeNull();
    expect(castForFoe(foe, "reeds", at(20 + FOE_DAYS, 19), 0)).toBeNull();
    const back = castForFoe(foe, "reeds", at(21), 0)!;
    expect(back.species.id).toBe("pike");
    expect(back.weight).toBe(19);
    expect(back.foe).toEqual({ lure: "Mepps spinner" });
  });
});
