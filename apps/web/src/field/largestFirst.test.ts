import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { largestFirst } from "./largestFirst";

const fish = (id: string, measure: CatchEntry["measure"], alsoMeasure?: CatchEntry["alsoMeasure"]): CatchEntry => ({
  id,
  species: "Pike",
  spotId: "s",
  tripId: null,
  caughtAt: "2026-10-01T08:00",
  lure: "",
  note: "",
  weather: null,
  measure,
  ...(alsoMeasure ? { alsoMeasure } : {}),
});

describe("largestFirst", () => {
  it("puts weighed fish first by weight, then measured ones by length, ties in the order given", () => {
    const list = [
      fish("long", { kind: "length", inches: 30 }),
      fish("light", { kind: "weight", pounds: 1.2 }),
      fish("short-a", { kind: "length", inches: 12 }),
      fish("heavy", { kind: "length", inches: 20 }, { kind: "weight", pounds: 4 }),
      fish("short-b", { kind: "length", inches: 12 }),
    ];
    expect(largestFirst(list).map((entry) => entry.id)).toEqual(["heavy", "light", "long", "short-a", "short-b"]);
  });
});
