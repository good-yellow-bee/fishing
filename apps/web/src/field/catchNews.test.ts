import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { catchNews } from "./catchNews";

describe("catchNews", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const pike = book.catches.find((entry) => entry.species === "Northern pike")!;

  it("names the first of a kind", () => {
    expect(catchNews(book, { species: "Muskellunge", measure: { kind: "length", inches: 40 } })).toBe("First Muskellunge in the book.");
  });

  it("names a new best and the size it beat, and stays quiet otherwise", () => {
    expect(catchNews(book, { species: pike.species, measure: { kind: "weight", pounds: 40 } })).toMatch(/^New best Northern pike: 40(\.0)? lb \(was .+\)\.$/);
    expect(catchNews(book, { species: pike.species, measure: { kind: "weight", pounds: 0.1 } })).toBeNull();
  });
});
