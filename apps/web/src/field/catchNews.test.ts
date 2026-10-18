import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { catchNews } from "./catchNews";

describe("catchNews", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const pike = book.catches.find((entry) => entry.species === "Northern pike")!;

  it("names the first of a kind", () => {
    expect(catchNews(book, { species: "Muskellunge", measure: { kind: "length", inches: 40 } })).toBe("First Muskellunge in the book.");
    // A game fish of the kind doesn't take the first away.
    const played = { ...book, catches: [...book.catches, { ...pike, id: "game-musky", species: "Muskellunge", spotId: "spot-stillwater" }] };
    expect(catchNews(played, { species: "Muskellunge", measure: { kind: "length", inches: 40 } })).toBe("First Muskellunge in the book.");
  });

  it("names a new best and the size it beat, and stays quiet otherwise", () => {
    expect(catchNews(book, { species: pike.species, measure: { kind: "weight", pounds: 40 } })).toMatch(/^New best Northern pike: 40(\.0)? lb \(was .+\)\.$/);
    expect(catchNews(book, { species: pike.species, measure: { kind: "weight", pounds: 0.1 } })).toBeNull();
  });
});

describe("catchNews beside the sample week", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const trout = book.catches.find((entry) => entry.species === "Brook trout")!;
  const own = { ...trout, id: "own-perch", species: "Yellow perch", spotId: "own-water" };

  it("leaves the sample's fish of a kind out once the angler has fish of their own", () => {
    expect(catchNews({ ...book, catches: [...book.catches, own] }, { species: "Brook trout", measure: { kind: "length", inches: 12.5 } })).toBe("First Brook trout in the book.");
    expect(catchNews(book, { species: "Brook trout", measure: { kind: "length", inches: 0.5 } })).toBeNull();
  });
});
