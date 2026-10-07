import { describe, expect, it } from "vitest";
import { fieldLogBestBeat, personalBests } from "./bests.ts";
import { sampleLogbook } from "./logbook.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);

describe("personal bests", () => {
  const book = sampleLogbook(now);

  it("ranks the sample northern pike as the large fish", () => {
    const bests = personalBests(book);
    expect(bests.longest).toMatchObject({
      id: "catch-pike-mepps",
      species: "Northern pike",
      measure: { kind: "length", inches: 28 },
    });
    expect(bests.heaviest).toMatchObject({
      id: "catch-pike-spin",
      species: "Northern pike",
      measure: { kind: "weight", pounds: 6.4 },
    });
    expect(bests.species.find((row) => row.species === "Northern pike")?.large).toBe(true);
    expect(bests.species.find((row) => row.species === "Bluegill")?.large).toBe(false);
    expect(bests.species.find((row) => row.species === "Smallmouth bass")?.large).toBe(false);
  });

  it("counts species and only waters that have fish", () => {
    const bests = personalBests(book);
    expect(bests.species.map((row) => [row.species, row.count])).toEqual([
      ["Brook trout", 3],
      ["Northern pike", 2],
      ["Smallmouth bass", 2],
      ["Bluegill", 1],
      ["Rainbow trout", 1],
      ["Yellow perch", 1],
    ]);
    expect(bests.species.find((row) => row.species === "Brook trout")).toMatchObject({
      longest: { measure: { kind: "length", inches: 11.5 } },
      heaviest: { measure: { kind: "weight", pounds: 0.4 } },
    });
    expect(bests.watersWithFish).toBe(5);
    expect(bests.waters.map((water) => water.name)).toEqual([
      "Blackduck Pond",
      "Cedar Bend",
      "Mill Race",
      "Oxbow Creek",
      "Quarry Cut",
    ]);

    const quiet = personalBests({
      ...book,
      catches: book.catches.filter((entry) => entry.spotId !== "spot-oxbow"),
    });
    expect(quiet.watersWithFish).toBe(4);
    expect(quiet.waters.some((water) => water.spotId === "spot-oxbow")).toBe(false);
  });

  it("stays empty when the book has no fish", () => {
    expect(personalBests({ spots: book.spots, trips: book.trips, catches: [] })).toEqual({
      longest: null,
      heaviest: null,
      species: [],
      watersWithFish: 0,
      waters: [],
    });
  });

  it("names a landed fish that beats a personal best already in the book", () => {
    const empty = { spots: book.spots, trips: book.trips, catches: [] };
    expect(fieldLogBestBeat(empty, "Brook trout", 2)).toBeNull();
    expect(fieldLogBestBeat(book, "Bluegill", 0.5)).toBeNull();
    expect(fieldLogBestBeat(book, "Brook trout", 0.4)).toBeNull();
    expect(fieldLogBestBeat(book, "Northern pike", 6.4)).toBeNull();

    expect(fieldLogBestBeat(book, "Brook trout", 1.2)).toEqual({
      scope: "species",
      previousPounds: 0.4,
      previousSpecies: "Brook trout",
      line: "Beats your 0.4 lb Brook trout already in the field log",
    });
    expect(fieldLogBestBeat(book, "Yellow perch", 0.8)).toMatchObject({
      scope: "species",
      previousPounds: 0.6,
      line: "Beats your 0.6 lb Yellow perch already in the field log",
    });
    expect(fieldLogBestBeat(book, "Northern pike", 7)).toEqual({
      scope: "book",
      previousPounds: 6.4,
      previousSpecies: "Northern pike",
      line: "Beats the 6.4 lb Northern pike already in the field log",
    });
    expect(fieldLogBestBeat(book, "Common carp", 8)).toMatchObject({
      scope: "book",
      previousSpecies: "Northern pike",
      line: "Beats the 6.4 lb Northern pike already in the field log",
    });
  });
});
