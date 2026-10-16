import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { hookTally } from "./hookTally";

describe("hookTally", () => {
  it("is null until an outing has a count", () => {
    expect(hookTally(sampleLogbook())).toBeNull();
  });

  it("sums the counted outings and the fish landed on them, on one water when asked", () => {
    const book = sampleLogbook();
    const [first, second] = book.trips;
    const counted = { ...book, trips: book.trips.map((trip) => (trip.id === first!.id ? { ...trip, lost: 2, missed: 3 } : trip.id === second!.id ? { ...trip, missed: 1 } : trip)) };
    const landedOn = (id: string) => book.catches.filter((entry) => entry.tripId === id).length;
    expect(hookTally(counted)).toEqual({ outings: 2, landed: landedOn(first!.id) + landedOn(second!.id), lost: 2, missed: 4 });
    const onFirstWater = hookTally(counted, first!.spotId)!;
    expect(onFirstWater.lost).toBe(2);
    expect(hookTally(counted, "no-such-water")).toBeNull();
  });
});
