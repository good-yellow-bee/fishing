import { describe, expect, it } from "vitest";
import { bestDay, biteTimeOf, biteTimes, fieldLogBestBeat, lureTally, moonQuarterOf, moonTally, personalBests, seasonTally, skyTally, waterTempTally, windTally } from "./bests.ts";
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

  it("counts one species however its name is capitalised", () => {
    const pike = book.catches.find((entry) => entry.species === "Northern pike")!;
    const mixed = { ...book, catches: [...book.catches, { ...pike, id: "catch-lower-pike", species: "northern pike " }] };
    const rows = personalBests(mixed).species.filter((row) => row.species.toLowerCase().trim() === "northern pike");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.species).toBe("Northern pike");
    expect(rows[0]!.count).toBe(personalBests(book).species.find((row) => row.species === "Northern pike")!.count + 1);
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

describe("the moon the fish came under", () => {
  it("names the week of the moon around known phases", () => {
    expect(moonQuarterOf(new Date(Date.UTC(2024, 0, 11, 12)))).toBe("new");
    expect(moonQuarterOf(new Date(Date.UTC(2024, 0, 18, 3)))).toBe("waxing");
    expect(moonQuarterOf(new Date(Date.UTC(2024, 0, 25, 18)))).toBe("full");
    expect(moonQuarterOf(new Date(Date.UTC(2024, 1, 2, 23)))).toBe("waning");
    expect(moonQuarterOf(new Date(Date.UTC(2000, 0, 21, 5)))).toBe("full");
  });

  it("counts every fish in one of the four weeks", () => {
    const base = sampleLogbook(now);
    const template = base.catches[0]!;
    const at = (ms: number, i: number) => ({ ...template, id: `m${i}`, caughtAt: new Date(ms).toISOString() });
    const book = {
      ...base,
      catches: [at(Date.UTC(2024, 0, 25, 18), 1), at(Date.UTC(2024, 0, 26, 2), 2), at(Date.UTC(2024, 0, 11, 12), 3)],
    };
    expect(moonTally(book).map((row) => [row.id, row.count])).toEqual([
      ["new", 1],
      ["waxing", 0],
      ["full", 2],
      ["waning", 0],
    ]);
  });
});

describe("the best day", () => {
  const base = sampleLogbook(now);
  const template = base.catches[0]!;
  const on = (day: number, hour: number, i: number) => ({ ...template, id: `d${i}`, caughtAt: new Date(2026, 6, day, hour).toISOString() });

  it("finds the local day with the most fish, the latest on a tie", () => {
    const book = { ...base, catches: [on(3, 6, 1), on(3, 23, 2), on(5, 7, 3), on(5, 8, 4), on(4, 9, 5)] };
    expect(bestDay(book)).toEqual({ date: "2026-07-05", count: 2 });
  });

  it("is empty for an empty book", () => {
    expect(bestDay({ ...base, catches: [] })).toBeNull();
  });
});

describe("fish by sky", () => {
  it("counts the fish under each sky and leaves out fish without weather", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const rows = skyTally(book);
    expect(rows.map((row) => row.id)).toEqual(["clear", "partly-cloudy", "overcast", "rain", "fog"]);
    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(book.catches.filter((entry) => entry.weather).length);
    expect(rows.find((row) => row.id === "overcast")!.count).toBeGreaterThan(0);
  });
});

describe("fish by wind and water temperature", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const weighed = book.catches.filter((entry) => entry.weather).length;

  it("counts the fish in each wind, calm first", () => {
    const rows = windTally(book);
    expect(rows[0]!.id).toBe("calm");
    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(weighed);
  });

  it("puts each fish in one band of water temperature, edges going to the warmer band", () => {
    const base = book.catches[0]!;
    const at = (id: string, waterTempF: number) => ({ ...base, id, weather: { sky: "clear" as const, wind: "calm" as const, waterTempF } });
    const rows = waterTempTally({ ...book, catches: [at("a", 42), at("b", 50), at("c", 59.9), at("d", 70), at("e", 85), { ...base, id: "f", weather: null }] });
    expect(rows).toEqual([
      { from: null, to: 50, count: 1 },
      { from: 50, to: 60, count: 2 },
      { from: 60, to: 70, count: 0 },
      { from: 70, to: null, count: 2 },
    ]);
    expect(waterTempTally(book).reduce((sum, row) => sum + row.count, 0)).toBe(weighed);
  });
});

describe("bests with a fish both measured and weighed", () => {
  it("counts the fish's second measure for the other best", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const heaviest = personalBests(book).heaviest!;
    const measuredOne = book.catches.find((entry) => entry.measure.kind === "length")!;
    const both = { ...measuredOne, alsoMeasure: { kind: "weight" as const, pounds: (heaviest.measure as { pounds: number }).pounds + 1 } };
    const bests = personalBests({ ...book, catches: book.catches.map((entry) => (entry.id === both.id ? both : entry)) });
    expect(bests.heaviest!.id).toBe(both.id);
  });
});
