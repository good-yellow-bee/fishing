import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches, searchTerms } from "./CatchSearch";

describe("search words without +", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const ids = (needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

  it("finds the fish every word finds when the words together find nothing", () => {
    expect(ids("cedar pike")).toEqual(ids("cedar + pike"));
    expect(ids("cedar pike").length).toBeGreaterThan(0);
    expect(ids("pike cedar + overcast")).toEqual(ids("pike + cedar + overcast"));
  });

  it("keeps a whole phrase that finds something, and leaves sizes whole", () => {
    expect(ids("Northern pike")).toEqual(ids("Northern pike + pike"));
    expect(ids("> 90 lb")).toEqual([]);
    expect(ids("cedar zebra")).toEqual([]);
  });

  it("finds a moon week by any of its words, and a time of day by the words anglers use", () => {
    for (const phase of ["new moon", "full moon"]) expect(ids(phase)).toEqual(ids(`near the ${phase}`));
    expect(ids("dusk")).toEqual(ids("evening"));
    expect(ids("sunrise")).toEqual(ids("dawn"));
    expect(ids("dawn").length).toBeGreaterThan(0);
  });

  it("doesn't take the words every moon week shares for a phase", () => {
    // Notes, waters and outings cleared, so only the moon could match.
    const bare = { spots: book.spots.map((spot) => ({ ...spot, name: "X", notes: "", bestConditions: "" })), trips: [], catches: book.catches.map((entry) => ({ ...entry, note: "", tripId: null })) };
    expect(findCatches(bare, "moon", t)).toEqual([]);
    expect(findCatches(bare, "full moon", t).length + findCatches(bare, "new moon", t).length).toBeGreaterThan(0);
  });

  it("finds a Polish moon week by the phase's own name, and nothing by the shared word", () => {
    const bare = { spots: book.spots.map((spot) => ({ ...spot, name: "X", notes: "", bestConditions: "" })), trips: [], catches: book.catches.map((entry) => ({ ...entry, note: "", tripId: null })) };
    const pl: Record<string, string> = { "Near the new moon": "Około nowiu", "Waxing moon": "Księżyc przybywa", "Near the full moon": "Około pełni", "Waning moon": "Księżyc ubywa" };
    const tPl = (text: string) => pl[text] ?? text;
    const ids = (needle: string) => findCatches(bare, needle, tPl).map((entry) => entry.id).sort();
    expect(ids("pełnia")).toEqual(ids("pełni"));
    expect(ids("nów")).toEqual(ids("nowiu"));
    expect(ids("pełnia").length + ids("nów").length).toBeGreaterThan(0);
    expect(ids("księżyc")).toEqual([]);
  });

  it("takes a size bound beside words as its own part", () => {
    expect(searchTerms("pike >5lb")).toEqual(["pike", ">5lb"]);
    expect(searchTerms("brook trout < 3 lb 2 oz at dawn")).toEqual(["brook", "trout", "< 3 lb 2 oz", "dawn"]);
    expect(searchTerms("perch >60°F")).toEqual(["perch", ">60°F"]);
    expect(ids("pike > 1 lb")).toEqual(ids("pike + > 1 lb"));
    expect(ids("pike > 1 lb").length).toBeGreaterThan(0);
  });

  it("keeps a date of a few words whole beside other words", () => {
    expect(searchTerms("pike last week")).toEqual(["pike", "last week"]);
    expect(searchTerms("pike oct 15")).toEqual(["pike", "oct 15"]);
  });

  it("finds the fish with a photo by “photo”", () => {
    const withPhoto = new Set([book.catches[0]!.id, book.catches[2]!.id]);
    const found = findCatches(book, "photo", t, (id) => withPhoto.has(id)).map((entry) => entry.id);
    expect(new Set(found)).toEqual(withPhoto);
    expect(findCatches(book, "photo", t)).toEqual([]);
  });
});
