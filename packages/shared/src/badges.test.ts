import { describe, expect, it } from "vitest";
import { badgeProgress, newlyEarned, type BadgeFactRow, type BadgeId } from "./badges.ts";
import { FISH, fishById } from "./fish.ts";
import { trophyWeight } from "./guide.ts";

function row(over: Partial<BadgeFactRow> = {}): BadgeFactRow {
  return { speciesId: "perch", spot: "dock", hour: "day", sky: "clear", clean: false, count: 1, heaviest: 0.5, ...over };
}

function earned(facts: BadgeFactRow[]): BadgeId[] {
  return badgeProgress(facts).filter((badge) => badge.earned).map((badge) => badge.id);
}

describe("lodge badges", () => {
  it("earns nothing with an empty book", () => {
    expect(earned([])).toEqual([]);
    expect(badgeProgress([]).every((badge) => badge.have === 0)).toBe(true);
  });

  it.each<[BadgeId, BadgeFactRow[], BadgeFactRow[]]>([
    ["four-banks", [row(), row({ spot: "reeds" }), row({ spot: "point" }), row({ spot: "dropoff" })], [row(), row({ spot: "reeds", count: 9 }), row({ spot: "point" })]],
    ["night-owl", [row({ hour: "night", count: 3 }), row({ hour: "night", spot: "reeds", count: 2 })], [row({ hour: "night", count: 4 }), row({ hour: "dusk", count: 9 })]],
    ["rain-pike", [row({ speciesId: "pike", sky: "rain" })], [row({ speciesId: "pike", sky: "fog" }), row({ sky: "rain" })]],
    ["clean-sweep", [row({ clean: true, count: 10 })], [row({ clean: true, count: 9 }), row({ count: 20 })]],
    ["trophy", [row({ heaviest: trophyWeight(fishById("perch")!) })], [row({ heaviest: trophyWeight(fishById("perch")!) - 0.1, count: 40 })]],
    ["full-book", FISH.map((fish) => row({ speciesId: fish.id })), FISH.slice(1).map((fish) => row({ speciesId: fish.id }))],
  ])("%s: earned on the first history, not on the near miss", (id, hit, miss) => {
    expect(earned(hit)).toContain(id);
    expect(earned(miss)).not.toContain(id);
  });

  it("caps progress at the goal and ignores rows with no hour or sky", () => {
    const night = badgeProgress([row({ hour: "night", count: 12 }), row({ hour: null, sky: null, count: 30 })]).find((b) => b.id === "night-owl")!;
    expect(night).toEqual({ id: "night-owl", have: 5, need: 5, earned: true });
  });

  it("names only the badges a new catch earned, and none on the first read", () => {
    const before = badgeProgress([row({ speciesId: "pike", sky: "fog" })]);
    const after = badgeProgress([row({ speciesId: "pike", sky: "rain" })]);
    expect(newlyEarned(null, after)).toEqual([]);
    expect(newlyEarned(before, after)).toEqual(["rain-pike"]);
    expect(newlyEarned(after, after)).toEqual([]);
  });
});
