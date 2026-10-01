import { describe, expect, it } from "vitest";
import { sampleLogbook } from "./logbook.ts";
import { searchCatches } from "./search.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);

describe("catch search", () => {
  const book = sampleLogbook(now);

  it("finds the sample pike by species, newest first", () => {
    expect(searchCatches(book, "pike").map((entry) => entry.id)).toEqual([
      "catch-pike-spin",
      "catch-pike-mepps",
    ]);
    expect(searchCatches(book, "  PIKE ").every((entry) => entry.species === "Northern pike")).toBe(true);
  });

  it("matches a water name or a lure", () => {
    expect(searchCatches(book, "mill race").map((entry) => entry.id)).toEqual([
      "catch-brook-nymph",
      "catch-brook-bugger",
    ]);
    expect(searchCatches(book, "mepps").map((entry) => entry.id)).toEqual(["catch-pike-mepps"]);
  });

  it("returns nothing for a blank query or a miss", () => {
    expect(searchCatches(book, "")).toEqual([]);
    expect(searchCatches(book, "   ")).toEqual([]);
    expect(searchCatches(book, "swordfish")).toEqual([]);
    expect(searchCatches(book, "pause")).toEqual([]);
  });
});
