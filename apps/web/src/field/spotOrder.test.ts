import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { spotsByLastFish } from "./spotOrder";

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
