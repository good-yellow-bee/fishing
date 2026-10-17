import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { intoMergedWaters } from "./waterMerge";

const spot = (id: string) => ({ id, name: id, waterType: "lake" as const, notes: "", bestConditions: "" });
const here = { spots: [spot("b"), spot("c")], trips: [], catches: [] } as unknown as Logbook;
const file = {
  spots: [spot("a"), spot("b"), spot("c")],
  trips: [{ id: "t", date: "2026-05-01", title: "Dawn", spotId: "a", note: "" }],
  catches: [{ id: "f", species: "Pike", spotId: "a", tripId: "t" }],
} as unknown as Logbook;

describe("intoMergedWaters", () => {
  it("moves a merged-away water's fish and outings into the water it joined", () => {
    const next = intoMergedWaters(file, here, { a: "b" });
    expect(next.spots.map((each) => each.id)).toEqual(["b", "c"]);
    expect(next.trips[0]!.spotId).toBe("b");
    expect(next.catches[0]!.spotId).toBe("b");
  });

  it("follows a water merged twice, and leaves an undone merge alone", () => {
    expect(intoMergedWaters(file, { ...here, spots: [spot("c")] }, { a: "b", b: "c" }).catches[0]!.spotId).toBe("c");
    expect(intoMergedWaters(file, { ...here, spots: [spot("a"), spot("b")] }, { a: "b" })).toBe(file);
  });
});
