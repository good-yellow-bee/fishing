import { describe, expect, it } from "vitest";
import { fishById } from "./fish.ts";
import { trophyWeight } from "./guide.ts";
import { huntClues, rumorFor } from "./legendHunt.ts";

describe("the legend hunt", () => {
  it("names a legend, one of its banks, an hour and a common prey there, the same all week and turning week by week", () => {
    const rumor = rumorFor("2026-10-19");
    const legend = fishById(rumor.legendId)!;
    expect(legend.rarity).toBe("legendary");
    expect(legend.spots).toContain(rumor.spot);
    const prey = fishById(rumor.preyId)!;
    expect(prey.rarity).toBe("common");
    expect(prey.spots).toContain(rumor.spot);
    expect(rumorFor("2026-10-19")).toEqual(rumor);
    const legendsSeen = new Set(["2026-10-19", "2026-10-26", "2026-11-02"].map((monday) => rumorFor(monday).legendId));
    expect(legendsSeen.size).toBe(3);
    // Every week's rumor has a prey to find at its bank.
    for (let week = 0; week < 60; week++) {
      const monday = new Date(Date.UTC(2026, 9, 19) + week * 7 * 86_400_000).toISOString().slice(0, 10);
      expect(fishById(rumorFor(monday).preyId)?.spots).toContain(rumorFor(monday).spot);
    }
  });

  it("finds each clue from the week's catches", () => {
    const rumor = rumorFor("2026-10-19");
    expect(huntClues(rumor, [])).toEqual([false, false, false]);
    const pike = fishById("pike")!;
    expect(
      huntClues(rumor, [
        { speciesId: rumor.preyId, spot: rumor.spot, hour: rumor.hour, weight: 0.1 },
        { speciesId: "pike", spot: "reeds", hour: "day", weight: trophyWeight(pike) },
      ]),
    ).toEqual([true, true, true]);
    expect(huntClues(rumor, [{ speciesId: rumor.preyId, spot: rumor.spot === "dock" ? "reeds" : "dock", hour: null, weight: 0.1 }])).toEqual([false, false, false]);
  });
});
