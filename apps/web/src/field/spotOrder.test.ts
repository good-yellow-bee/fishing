import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { likelyWater, spotsByLastFish } from "./spotOrder";

describe("spot order", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));

  it("puts the most recently fished water first and empty waters last, in book order", () => {
    const bare = { id: "spot-new", name: "New pond", waterType: "pond" as const, notes: "", bestConditions: "" };
    const rows = spotsByLastFish({ ...book, spots: [bare, ...book.spots] });
    const times = rows.map((row) => row.lastFishAt).filter((at): at is string => at !== null);
    expect(times).toEqual([...times].sort().reverse());
    expect(rows.at(-1)?.spot.id).toBe("spot-new");
    expect(rows.at(-1)?.fishCount).toBe(0);
  });
});

describe("likely water", () => {
  const spot = (id: string) => ({ id, name: id, waterType: "lake" as const, notes: "", bestConditions: "" });
  const fishAt = (id: string, spotId: string, caughtAt: string) => ({ id, species: "Bluegill", measure: { kind: "length" as const, inches: 6 }, lure: "Worm", spotId, tripId: null, caughtAt, note: "", weather: null });
  const book = {
    spots: [spot("first"), spot("creek"), spot("lake")],
    trips: [{ id: "t1", date: "2026-10-16", spotId: "creek", title: "Creek", note: "" }],
    catches: [fishAt("a", "lake", "2026-10-15T10:00:00.000Z"), fishAt("b", "creek", "2026-09-01T10:00:00.000Z")],
  };

  it("picks today's outing's water over the one fished last", () => {
    expect(likelyWater(book, "2026-10-16")).toBe("creek");
  });

  it("picks the water fished last when nothing is on today, and the first water in an empty book", () => {
    expect(likelyWater(book, "2026-10-17")).toBe("lake");
    expect(likelyWater({ ...book, catches: [] }, "2026-10-17")).toBe("first");
    expect(likelyWater({ spots: [], trips: [], catches: [] }, "2026-10-17")).toBe("");
  });
});
