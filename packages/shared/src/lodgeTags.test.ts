import { describe, expect, it } from "vitest";
import { fishById } from "./fish.ts";
import { isTaggable, taggedWeightFits } from "./lodgeTags.ts";

describe("lodge-tagged fish", () => {
  it("remembers only fish past the small common ones, and no legend", () => {
    expect(isTaggable(fishById("perch"))).toBe(false);
    expect(isTaggable(fishById("ghost-pike"))).toBe(false);
    expect(isTaggable(fishById("carp"))).toBe(true);
    expect(isTaggable(undefined)).toBe(false);
  });

  it("fits a weight no lighter than the fish let go, grown at most 30% and never past its kind's top", () => {
    const bass = fishById("smallmouth-bass")!;
    expect(taggedWeightFits(bass, 2, 2)).toBe(true);
    expect(taggedWeightFits(bass, 2, 2.6)).toBe(true);
    expect(taggedWeightFits(bass, 2, 2.7)).toBe(false);
    expect(taggedWeightFits(bass, 2, 1.9)).toBe(false);
    expect(taggedWeightFits(bass, 3.5, 4.5)).toBe(false);
  });
});
