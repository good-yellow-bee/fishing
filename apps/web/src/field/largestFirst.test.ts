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
  it("ranks weighed fish by weight and measured ones by the weight their length suggests, ties in the order given", () => {
    const list = [
      fish("long", { kind: "length", inches: 30 }),
      fish("light", { kind: "weight", pounds: 1.2 }),
      fish("short-a", { kind: "length", inches: 12 }),
      fish("heavy", { kind: "length", inches: 20 }, { kind: "weight", pounds: 4 }),
      fish("short-b", { kind: "length", inches: 12 }),
    ];
    expect(largestFirst(list).map((entry) => entry.id)).toEqual(["long", "heavy", "light", "short-a", "short-b"]);
  });

  it("goes by the kind's own measured and weighed fish where it has two", () => {
    const list = [
      fish("a", { kind: "length", inches: 10 }, { kind: "weight", pounds: 0.25 }),
      fish("b", { kind: "length", inches: 20 }, { kind: "weight", pounds: 2 }),
      fish("measured", { kind: "length", inches: 24 }),
      fish("weighed", { kind: "weight", pounds: 3 }),
    ];
    // 24 in by these two is about 3.5 lb: ahead of the 3 lb one.
    expect(largestFirst(list).map((entry) => entry.id)).toEqual(["measured", "weighed", "b", "a"]);
  });
});
