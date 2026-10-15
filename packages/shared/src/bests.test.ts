import { describe, expect, it } from "vitest";
import { biteTimeOf, biteTimes, fieldLogBestBeat, lureTally, personalBests, seasonTally } from "./bests.ts";
import { keepLandedCatch, sampleLogbook } from "./logbook.ts";

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

    const saved = keepLandedCatch(book, {
      id: "catch-play-perch",
      species: "Yellow perch",
      pounds: 0.8,
      bank: "dock",
      caughtAt: "2026-10-07T18:00:00.000Z",
    });
    expect(fieldLogBestBeat(saved, "Yellow perch", 0.8)).toBeNull();
    expect(fieldLogBestBeat(saved, "Yellow perch", 0.8, "catch-play-perch")).toMatchObject({
      scope: "species",
      previousPounds: 0.6,
      line: "Beats your 0.6 lb Yellow perch already in the field log",
    });
  });
});

describe("when and on what the fish came", () => {
  const at = (hours: number) => new Date(2026, 5, 1, hours, 30).toISOString();
  const book = (rows: Array<[number, string]>) => {
    const base = sampleLogbook(new Date(2026, 5, 2));
    const template = base.catches[0]!;
    return { ...base, catches: rows.map(([hour, lure], i) => ({ ...template, id: `c${i}`, caughtAt: at(hour), lure })) };
  };

  it("files each hour under its part of the day, night wrapping past midnight", () => {
    expect([4, 8, 11, 15, 18, 21, 0, 3].map(biteTimeOf)).toEqual(["dawn", "morning", "midday", "afternoon", "evening", "night", "night", "night"]);
  });

  it("counts every part of the day, even the empty ones", () => {
    const times = biteTimes(book([[5, "a"], [6, "a"], [22, "b"], [2, "b"]]));
    expect(times.map((row) => [row.id, row.count])).toEqual([
      ["dawn", 2],
      ["morning", 0],
      ["midday", 0],
      ["afternoon", 0],
      ["evening", 0],
      ["night", 2],
    ]);
  });

  it("ranks lures by fish, without splitting one lure by case or spaces", () => {
    const lures = lureTally(book([[5, "Woolly bugger"], [6, "woolly  bugger"], [7, "Spinner"], [8, "Bobber"], [9, "Spinner"], [10, "Woolly Bugger"]]), 2);
    expect(lures).toEqual([
      { lure: "Woolly bugger", count: 3 },
      { lure: "Spinner", count: 2 },
    ]);
  });
});

describe("the seasons the fish came in", () => {
  it("counts all four seasons by the month each fish was caught", () => {
    const base = sampleLogbook(now);
    const template = base.catches[0]!;
    const on = (month: number, i: number) => ({ ...template, id: `s${i}`, caughtAt: new Date(2026, month, 10, 9).toISOString() });
    const book = { ...base, catches: [on(3, 1), on(4, 2), on(7, 3), on(11, 4), on(0, 5)] };
    expect(seasonTally(book).map((row) => [row.id, row.label, row.count])).toEqual([
      ["spring", "Spring", 2],
      ["summer", "Summer", 1],
      ["fall", "Fall", 0],
      ["winter", "Winter", 2],
    ]);
  });
});
