import { describe, expect, it } from "vitest";
import { personalBests, type CatchEntry, type Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { pieceTally } from "./pieceTally";
import { renameInBook } from "./bookRename";
import { catchesOfSpecies, kindKey, pageCounts, speciesCounts } from "./speciesLink";
import { waterSpecies } from "./waterTips";

const fish = (id: string, species: string, lure = "Jig"): CatchEntry => ({ id, species, measure: { kind: "length", inches: 10 }, lure, spotId: "own", tripId: null, caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });

describe("round 105: a kind however it was typed", () => {
  const catches = [fish("a", "perch "), fish("b", "Perch"), fish("c", "Perch"), fish("d", "Perches"), fish("e", "Pike")];
  const book: Logbook = { spots: [], trips: [], catches };

  it("is one chip, under the spelling most of its fish carry", () => {
    expect(speciesCounts(catches)).toEqual([{ species: "Perch", count: 4 }, { species: "Pike", count: 1 }]);
    expect(waterSpecies(catches, 1)).toEqual(["Perch"]);
  });

  it("opens the same fish on its page and in the search", () => {
    expect(catchesOfSpecies(book, "Perch").map((entry) => entry.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(findCatches(book, `species:"Perch"`, t).map((entry) => entry.id).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("round 105: a lure's name in a tie of spellings", () => {
  it("is the same whatever order the fish come in", () => {
    const catches = [fish("a", "Perch", "Spinners"), fish("b", "Perch", "Spinner"), fish("c", "Perch", "spinner ")];
    expect(pieceTally(catches)[0]!.lure).toBe("Spinner");
    expect(pieceTally([...catches].reverse())[0]!.lure).toBe("Spinner");
  });
});

describe("round 105: one kind key everywhere", () => {
  it("keeps a Latin name's own s", () => {
    expect(kindKey("Perches")).toBe(kindKey("perch "));
    expect(kindKey("Esox lucius")).toBe("esox lucius");
  });

  it("does not count a kind twice across the page's tiers", () => {
    const game = (id: string) => ({ ...fish(id, "Perches"), spotId: "spot-stillwater" });
    expect(pageCounts([fish("a", "Perch"), game("g1"), game("g2")])).toEqual([{ species: "Perch", count: 1 }]);
  });

  it("renames every spelling of a kind", () => {
    const renamed = renameInBook({ spots: [], trips: [], catches: [fish("a", "Perch"), fish("b", "Perches")] }, "species", "Perch", "Yellow perch");
    expect(renamed.ok && renamed.book.catches.map((entry) => entry.species)).toEqual(["Yellow perch", "Yellow perch"]);
  });
});

describe("round 105: a kind's record on Bests", () => {
  it("counts every spelling the kind's page opens", () => {
    const book: Logbook = { spots: [], trips: [], catches: [fish("a", "Silver perch"), fish("b", "Silver perch"), fish("c", "Silver perches")] };
    expect(personalBests(book, kindKey).species.map((row) => row.count)).toEqual([3]);
  });
});
