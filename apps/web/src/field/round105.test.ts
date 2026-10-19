import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { pieceTally } from "./pieceTally";
import { catchesOfSpecies, speciesCounts } from "./speciesLink";
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
