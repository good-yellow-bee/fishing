import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { anotherCatchLink } from "./anotherCatch";

describe("another catch like this", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));

  it("carries the water, outing, species, lure and measure", () => {
    const entry = book.catches.find((row) => row.tripId)!;
    const params = new URLSearchParams(anotherCatchLink(entry).split("?")[1]);
    expect(params.get("spot")).toBe(entry.spotId);
    expect(params.get("trip")).toBe(entry.tripId);
    expect(params.get("species")).toBe(entry.species);
    expect(params.get("lure")).toBe(entry.lure);
    expect(params.get("kind")).toBe(entry.measure.kind);
  });

  it("leaves the outing out for a fish without one", () => {
    const entry = { ...book.catches[0]!, tripId: null };
    expect(new URLSearchParams(anotherCatchLink(entry).split("?")[1]).has("trip")).toBe(false);
  });
});
