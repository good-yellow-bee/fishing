import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { toLocalInput } from "./format";
import { likelyDuplicate } from "./likelyDuplicate";

describe("likelyDuplicate", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const fish = sample.catches[0]!;
  // That fish alone, so no other one of its kind sits nearby.
  const book = { ...sample, catches: [fish] };
  const near = toLocalInput(new Date(new Date(fish.caughtAt).getTime() + 5 * 60 * 1000));
  const far = toLocalInput(new Date(new Date(fish.caughtAt).getTime() + 30 * 60 * 1000));

  it("finds the same kind at the same water a few minutes apart", () => {
    expect(likelyDuplicate(book, { species: fish.species.toUpperCase(), spotId: fish.spotId, caughtAt: near })?.id).toBe(fish.id);
  });

  it("leaves other times, waters and kinds alone", () => {
    expect(likelyDuplicate(book, { species: fish.species, spotId: fish.spotId, caughtAt: far })).toBeNull();
    expect(likelyDuplicate(book, { species: fish.species, spotId: "elsewhere", caughtAt: near })).toBeNull();
    expect(likelyDuplicate(book, { species: "Zander", spotId: fish.spotId, caughtAt: near })).toBeNull();
    expect(likelyDuplicate(book, { species: fish.species, spotId: fish.spotId, caughtAt: near }, undefined, () => false)).toBeNull();
  });
});
