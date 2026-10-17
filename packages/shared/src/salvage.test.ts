import { describe, expect, it } from "vitest";
import { salvageLogbook, sampleLogbook } from "./index.ts";

describe("salvageLogbook", () => {
  const sample = sampleLogbook(new Date(2026, 9, 10));

  it("keeps each entry that reads, less those whose water is gone", () => {
    const fish = sample.catches[0]!;
    const book = salvageLogbook({
      spots: [sample.spots[0], { id: 3 }],
      trips: sample.trips,
      catches: [fish, { ...fish, id: "elsewhere", spotId: "gone" }, "junk"],
    });
    expect(book?.spots).toEqual([sample.spots[0]]);
    expect(book?.trips.every((trip) => trip.spotId === sample.spots[0]!.id)).toBe(true);
    expect(book?.catches.map((entry) => entry.id)).toEqual(fish.spotId === sample.spots[0]!.id ? [fish.id] : []);
  });

  it("takes off an outing link that leads nowhere, and keeps the first of an id", () => {
    const fish = { ...sample.catches[0]!, tripId: "no-such-trip" };
    const book = salvageLogbook({ spots: sample.spots, trips: [], catches: [fish, { ...fish, species: "Other" }] });
    expect(book?.catches).toEqual([{ ...fish, tripId: null }]);
  });

  it("is null when nothing reads", () => {
    expect(salvageLogbook({ spots: [], trips: [], catches: [{ id: "x" }] })).toBeNull();
    expect(salvageLogbook("nope")).toBeNull();
  });
});
