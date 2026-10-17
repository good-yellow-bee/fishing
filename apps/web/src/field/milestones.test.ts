import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { milestoneOf } from "./milestones";

describe("milestoneOf", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (i: number, species: string): CatchEntry => ({ ...base, id: `m${i}`, species, caughtAt: new Date(2026, 0, 1, 0, i).toISOString() });
  const catches = Array.from({ length: 120 }, (_, i) => fish(i, i % 10 === 0 ? "Walleye" : "Bluegill"));
  const book = { spots: [], trips: [], catches };

  it("marks the 50th and 100th fish in the book", () => {
    expect(milestoneOf(book, catches[49]!)).toEqual({ of: "book", n: 50 });
    expect(milestoneOf(book, catches[99]!)).toEqual({ of: "book", n: 100 });
  });

  it("marks the first and the tenth of a kind", () => {
    expect(milestoneOf(book, catches[0]!)).toEqual({ of: "kind", n: 1 });
    expect(milestoneOf(book, catches[1]!)).toEqual({ of: "kind", n: 1 });
    expect(milestoneOf(book, catches[90]!)).toEqual({ of: "kind", n: 10 });
    expect(milestoneOf(book, catches[3]!)).toBeNull();
  });

  it("says nothing for the only fish of its kind", () => {
    const lone = fish(500, "Muskellunge");
    expect(milestoneOf({ ...book, catches: [...catches, lone] }, lone)).toBeNull();
  });
});
