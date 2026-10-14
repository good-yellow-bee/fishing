import { describe, expect, it } from "vitest";
import { FISH, fishById } from "./fish.ts";
import {
  biteSeasonMul,
  isLakeSeason,
  LAKE_SEASONS,
  lakeSeason,
  peakSeason,
  SEASON_BLURB,
  SEASON_LABELS,
  SEASON_SPECIES,
  seasonFromSearch,
} from "./season.ts";

describe("lake seasons", () => {
  it("follows the local calendar month", () => {
    const months = Array.from({ length: 12 }, (_, month) => lakeSeason(new Date(2026, month, 15, 12)));
    expect(months).toEqual([
      "winter", "winter",
      "spring", "spring", "spring",
      "summer", "summer", "summer",
      "fall", "fall", "fall",
      "winter",
    ]);
    // The turn happens at local midnight, on the same clock as the lake hour.
    expect(lakeSeason(new Date(2026, 2, 1, 0, 0))).toBe("spring");
    expect(lakeSeason(new Date(2026, 1, 28, 23, 59))).toBe("winter");
  });

  it("reads ?season= for testing and ignores anything else", () => {
    expect(seasonFromSearch("?season=fall")).toBe("fall");
    expect(seasonFromSearch("hour=night&season=winter")).toBe("winter");
    expect(seasonFromSearch("?season=autumn")).toBeNull();
    expect(seasonFromSearch("")).toBeNull();
    expect(isLakeSeason("spring")).toBe(true);
    expect(isLakeSeason(3)).toBe(false);
  });

  it("labels and describes every season", () => {
    for (const season of LAKE_SEASONS) {
      expect(SEASON_LABELS[season]).toBeTruthy();
      expect(SEASON_BLURB[season].length).toBeLessThanOrEqual(60);
    }
  });

  it("only names real species, and never locks a fish away", () => {
    for (const season of LAKE_SEASONS) {
      for (const id of Object.keys(SEASON_SPECIES[season])) expect(fishById(id), `${season} ${id}`).toBeTruthy();
      for (const fish of FISH) {
        const mul = biteSeasonMul(fish, season);
        expect(mul).toBeGreaterThan(0.5);
        expect(mul).toBeLessThanOrEqual(2.4);
      }
    }
  });

  it("runs salmon in fall and burbot in winter", () => {
    const salmon = fishById("salmon")!;
    const burbot = fishById("burbot")!;
    for (const season of LAKE_SEASONS) {
      if (season !== "fall") expect(biteSeasonMul(salmon, "fall")).toBeGreaterThan(biteSeasonMul(salmon, season) * 1.5);
      if (season !== "winter") expect(biteSeasonMul(burbot, "winter")).toBeGreaterThan(biteSeasonMul(burbot, season) * 1.5);
    }
    expect(peakSeason("salmon")).toBe("fall");
    expect(peakSeason("burbot")).toBe("winter");
    expect(peakSeason("carp")).toBe("summer");
    expect(peakSeason("golden-shiner")).toBeNull();
  });
});
