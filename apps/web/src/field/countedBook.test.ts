import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { countedBook } from "./milestones";

describe("the book a year's count reads", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));

  it("keeps the sample week while it is all there is", () => {
    expect(countedBook(sample)).toEqual(sample);
  });

  it("leaves the sample week's fish and outings out beside the angler's own", () => {
    const mine = { ...sample.catches[0]!, id: "mine-1", tripId: null };
    const book = countedBook({ ...sample, catches: [...sample.catches, mine] });
    expect(book.catches.map((entry) => entry.id)).toEqual(["mine-1"]);
    expect(book.trips).toEqual([]);
  });

  it("leaves the game's lake out", () => {
    const game = { ...sample.catches[0]!, id: "game-1", spotId: "spot-stillwater", tripId: null };
    expect(countedBook({ ...sample, catches: [...sample.catches, game] }).catches.map((entry) => entry.id)).not.toContain("game-1");
  });
});
