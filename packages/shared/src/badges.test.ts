import { describe, expect, it } from "vitest";
import { badgeProgress, FIRST_BOOK, newlyEarned, type BadgeFactRow, type BadgeId } from "./badges.ts";
import { FISH, fishById } from "./fish.ts";
import { trophyWeight } from "./guide.ts";

function row(over: Partial<BadgeFactRow> = {}): BadgeFactRow {
  return { speciesId: "perch", spot: "dock", hour: "day", sky: "clear", season: "summer", clean: false, golden: false, count: 1, heaviest: 0.5, ...over };
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
    [
      "four-seasons",
      [row({ season: "spring" }), row({ season: "summer" }), row({ season: "fall", speciesId: "salmon" }), row({ season: "winter" })],
      [row({ season: "spring", count: 9 }), row({ season: "summer" }), row({ season: "fall" }), row({ season: null, count: 30 })],
    ],
    ["gold", [row({ golden: true })], [row({ count: 200 })]],
    ["full-book", FIRST_BOOK.map((id) => row({ speciesId: id })), FISH.filter((fish) => fish.id !== FIRST_BOOK[0]).map((fish) => row({ speciesId: fish.id }))],
  ])("%s: earned on the first history, not on the near miss", (id, hit, miss) => {
    expect(earned(hit)).toContain(id);
    expect(earned(miss)).not.toContain(id);
  });

  it("keeps Full book to the first thirteen species, so the inlet's fish don't take it away", () => {
    expect(FIRST_BOOK.every((id) => fishById(id))).toBe(true);
    const book = badgeProgress(FIRST_BOOK.map((id) => row({ speciesId: id }))).find((b) => b.id === "full-book")!;
    expect(book).toEqual({ id: "full-book", have: 13, need: 13, earned: true });
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
