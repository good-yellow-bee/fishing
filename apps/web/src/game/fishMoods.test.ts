import { FISH } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { COLD_LOVERS, currentTireMul, fallFeedTireMul, nestTireMul, nightTireMul, rainHunterTireMul, runTireMul, seasonTireMul, spentTireMul, springRunTireMul, summerStrengthTireMul, twilightTireMul, warmTireMul } from "./fight";
import { fightsHardWhen, tiresSoonerWhen } from "./fishMoods";

describe("fish moods for the field guide", () => {
  it("names when a burbot fights hard", () => {
    expect(fightsHardWhen("burbot")).toEqual(["in winter's cold", "after dark", "in rain"]);
    expect(tiresSoonerWhen("burbot")).toEqual([]);
  });

  it("names when a pike fights hard and when it tires sooner", () => {
    expect(fightsHardWhen("pike")).toEqual(["in winter's cold", "in fall"]);
    expect(tiresSoonerWhen("pike")).toEqual(["in spring, after spawning"]);
  });

  it("says nothing for a fish with no such habit", () => {
    expect(fightsHardWhen("golden-shiner")).toEqual([]);
    expect(tiresSoonerWhen("golden-shiner")).toEqual([]);
  });

  // Every fish whose tire multiplier drops under some condition gets a line, and every one with a line has such a condition.
  it.each(FISH.map((fish) => fish.id))("matches the fight habits for %s", (id) => {
    const seasons = ["spring", "summer", "fall", "winter"];
    const stronger =
      COLD_LOVERS.has(id) ||
      seasons.some((season) => runTireMul(season, id) < 1 || fallFeedTireMul(season, id) < 1 || summerStrengthTireMul(season, id) < 1 || nestTireMul(season, id, "reeds") < 1 || springRunTireMul(season, id, "inlet") < 1) ||
      currentTireMul(id, "inlet") < 1 ||
      nightTireMul("night", id) < 1 ||
      twilightTireMul("dusk", id) < 1 ||
      rainHunterTireMul("rain", id) < 1;
    const weaker = seasons.some((season) => spentTireMul(season, id) > 1 || warmTireMul(season, id) > 1);
    expect(fightsHardWhen(id).length > 0).toBe(stronger);
    expect(tiresSoonerWhen(id).length > 0).toBe(weaker);
    expect(seasonTireMul("winter", id) > 1).toBe(!COLD_LOVERS.has(id));
  });
});
