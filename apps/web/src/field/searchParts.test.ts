import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { searchParts } from "./CatchSearch";

describe("split a search on +", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const book = { ...sample, spots: sample.spots.map((spot, i) => (i === 0 ? { ...spot, name: "Pond + creek" } : spot)) };

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
    expect(searchParts(book, "30in + pike")).toEqual(["30in", "pike"]);
  });
});
