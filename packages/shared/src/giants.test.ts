import { describe, expect, it } from "vitest";
import { fishById } from "./fish.ts";
import { GIANT_BANKS, giantAt, giantsForWeek } from "./giants.ts";

describe("the lake's giants", () => {
  it("gives every bank one named giant a week, the same all week, of a kind that lives there, at the top of its range", () => {
    const monday = new Date(Date.UTC(2026, 9, 19, 1));
    const sunday = new Date(Date.UTC(2026, 9, 25, 23));
    const giants = giantsForWeek(monday);
    expect(giants.map((giant) => giant.spot)).toEqual(GIANT_BANKS);
    expect(giantsForWeek(sunday)).toEqual(giants);
    expect(new Set(giants.map((giant) => giant.name)).size).toBe(giants.length);
    for (const giant of giants) {
      const species = fishById(giant.speciesId)!;
      expect(species.spots).toContain(giant.spot);
      expect(species.rarity).not.toBe("legendary");
      expect(giant.weight).toBeLessThanOrEqual(species.maxWeight);
      expect(giant.weight).toBeGreaterThanOrEqual(species.maxWeight * 0.95 - 0.01);
    }
    expect(giantAt("open", monday)).toBeUndefined();
  });

  it("changes them from week to week", () => {
    const one = giantsForWeek(new Date(Date.UTC(2026, 9, 19)));
    const next = giantsForWeek(new Date(Date.UTC(2026, 9, 26)));
    expect(next).not.toEqual(one);
  });
});
