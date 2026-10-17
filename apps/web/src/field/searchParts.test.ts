import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { searchParts } from "./CatchSearch";

describe("split a search on +", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const book = { ...sample, spots: sample.spots.map((spot, i) => (i === 0 ? { ...spot, name: "Pond + creek" } : spot)) };

  it("reads the words for a bound as > and <", () => {
    expect(searchParts(book, "pike over 10 in")).toEqual(["pike >10 in"]);
    expect(searchParts(book, "under 2 lb")).toEqual(["<2 lb"]);
    expect(searchParts(book, "szczupak ponad 60 cm")).toEqual(["szczupak >60 cm"]);
    expect(searchParts(book, "poniżej 1,5 kg")).toEqual(["<1,5 kg"]);
    expect(searchParts(book, "szczupak większy niż 60 cm")).toEqual(["szczupak >60 cm"]);
    expect(searchParts(book, "okoń dluzsze niz 25 cm")).toEqual(["okoń >25 cm"]);
    expect(searchParts(book, "lżejsze niż 2 kg")).toEqual(["<2 kg"]);
    expect(searchParts(book, "over 10 inches")).toEqual([">10 in"]);
    // Not before a word: "over the weeds" stays text.
    expect(searchParts(book, "over the weeds")).toEqual(["over the weeds"]);
  });

  it("reads a size range as both bounds, and leaves dates alone", () => {
    expect(searchParts(book, "pike 25-30 in")).toEqual(["pike >25 in", "<=30 in"]);
    expect(searchParts(book, "1,5–2 kg")).toEqual([">1,5 kg", "<=2 kg"]);
    expect(searchParts(book, "30-25 in")).toEqual([">25 in", "<=30 in"]);
    expect(searchParts(book, "pike 20+ in")).toEqual(["pike >20 in"]);
  });

  it("reads one size as the fish that round to it", () => {
    expect(searchParts(book, "pike 17 in")).toEqual(["pike >16.5 in", "<17.5 in"]);
    expect(searchParts(book, "2,5 kg")).toEqual([">2.45 kg", "<2.55 kg"]);
    expect(searchParts(book, "3 lb 2 oz")).toEqual(["3 lb 2 oz"]);
    expect(searchParts(book, ">3 lb")).toEqual([">3 lb"]);
    expect(searchParts(book, "2026-10-12")).toEqual(["2026-10-12"]);
  });

  it("joins parts on +", () => {
    expect(searchParts(book, "Northern pike + >2 lb")).toEqual(["Northern pike", ">2 lb"]);
  });

  it("keeps a water named with a + in one piece", () => {
    expect(searchParts(book, "pond + creek + Brook trout")).toEqual(["pond + creek", "Brook trout"]);
    expect(searchParts(book, "Pond + creek")).toEqual(["Pond + creek"]);
  });

  it("reads a size with a + after it as that size and up", () => {
    expect(searchParts(book, "pike 30in+")).toEqual(["pike >30in"]);
    expect(searchParts(book, "2 kg+ + Overcast")).toEqual([">2 kg", "Overcast"]);
    expect(searchParts(book, "60F+")).toEqual([">60F"]);
    expect(searchParts(book, "30in + pike")).toEqual([">29.5 in", "<30.5 in", "pike"]);
    expect(searchParts(book, "pike+5lb+")).toEqual(["pike", ">5lb"]);
    expect(searchParts(book, "3 lb 2 oz+")).toEqual([">3 lb 2 oz"]);
  });
});
