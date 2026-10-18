import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { parseSizeQuery } from "./sizeQuery";

describe("searching fish as people type them", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const fish = sample.catches[0]!;
  const ids = (book: typeof sample, needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

  afterEach(() => {
    vi.useRealTimers();
  });

  it("finds a kind by its plural", () => {
    const pike = sample.catches.filter((entry) => entry.species === "Northern pike").map((entry) => entry.id);
    expect(pike.length).toBeGreaterThan(0);
    expect(ids(sample, "pikes")).toEqual(expect.arrayContaining(pike));
  });

  it("finds a month in any of its Polish forms", () => {
    const book = { ...sample, catches: [{ ...fish, id: "oct", caughtAt: new Date(2026, 9, 3, 9).toISOString() }, { ...fish, id: "sep", caughtAt: new Date(2026, 8, 3, 9).toISOString() }] };
    expect(ids(book, "października")).toEqual(["oct"]);
    expect(ids(book, "w październiku")).toEqual(["oct"]);
    expect(ids(book, "we wrześniu")).toEqual(["sep"]);
  });

  it("reads millimetres and decagrams as the catch form does", () => {
    expect(parseSizeQuery(">450 mm")?.kind).toBe("length");
    expect(parseSizeQuery(">450 mm")?.amount).toBeCloseTo(17.717, 2);
    expect(parseSizeQuery("<85 dag")?.amount).toBeCloseTo(1.874, 2);
  });

  it("puts a night session's small hours on its outing's day for date words too", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    const book = {
      ...sample,
      trips: [...sample.trips, { ...sample.trips[0]!, id: "trip-night", spotId: fish.spotId, date: "2026-10-10" }],
      catches: [{ ...fish, id: "late", tripId: "trip-night", caughtAt: new Date(2026, 9, 11, 1).toISOString() }],
    };
    expect(ids(book, "yesterday")).toEqual(["late"]);
    expect(ids(book, "today")).toEqual([]);
  });
});
