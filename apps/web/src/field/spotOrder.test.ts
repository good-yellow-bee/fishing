import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { daysBetween, kmBetween, lastOutByWater, likelyWater, nearestWater, spotsByLastFish } from "./spotOrder";

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

  it("never picks the game's lake, even fished today", () => {
    const played = {
      spots: [...book.spots, spot("spot-stillwater")],
      trips: [...book.trips, { id: "play", date: "2026-10-17", spotId: "spot-stillwater", title: "", note: "" }],
      catches: [...book.catches, fishAt("g", "spot-stillwater", "2026-10-17T09:00:00.000Z")],
    };
    expect(likelyWater(played, "2026-10-17")).toBe("lake");
  });
});

describe("nearestWater", () => {
  const water = (id: string, place?: { lat: number; lng: number }) => ({ id, name: id, waterType: "lake" as const, notes: "", ...(place ? { place } : {}) });
  it("picks the pinned water nearest to where the player stands", () => {
    const book = { spots: [water("far", { lat: 47, lng: -94 }), water("none"), water("near", { lat: 46.85, lng: -94.25 })], trips: [], catches: [] };
    const found = nearestWater(book as never, { lat: 46.86, lng: -94.24 });
    expect(found?.spot.id).toBe("near");
    expect(found!.km).toBeGreaterThan(1);
    expect(found!.km).toBeLessThan(2);
    expect(nearestWater({ spots: [water("none")], trips: [], catches: [] } as never, { lat: 0, lng: 0 })).toBeNull();
  });

  it("measures along the ground", () => {
    expect(kmBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1);
  });
});

describe("when each water was last fished", () => {
  it("takes the later of an outing up to today and a fish, never a planned day", () => {
    const book = sampleLogbook(new Date(2026, 9, 10));
    const spot = book.spots[0]!.id;
    const other = book.spots[1]!.id;
    const fish = { ...book.catches[0]!, id: "zq-last", spotId: other, tripId: null, caughtAt: new Date(2026, 9, 12, 9).toISOString() };
    const last = lastOutByWater(
      {
        ...book,
        trips: [
          { id: "zq-a", date: "2026-10-05", spotId: spot, title: "", note: "" },
          { id: "zq-b", date: "2026-10-20", spotId: spot, title: "", note: "" },
          { id: "zq-c", date: "2026-10-01", spotId: other, title: "", note: "" },
          { id: "zq-d", date: "2026-10-15", spotId: "zq-today", title: "", note: "" },
          { id: "zq-e", date: "2026-10-14", spotId: "spot-stillwater", title: "", note: "" },
        ],
        catches: [fish],
      },
      "2026-10-15",
    );
    expect(last.get(spot)).toBe("2026-10-05");
    expect(last.get(other)).toBe("2026-10-12");
    // Today's outing with no fish yet, and the game's lake, say nothing.
    expect(last.has("zq-today")).toBe(false);
    expect(last.has("spot-stillwater")).toBe(false);
    expect(daysBetween("2026-10-05", "2026-10-15")).toBe(10);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});
