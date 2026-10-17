import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { mergeWaters } from "./waterMerge";

const book: Logbook = {
  spots: [
    { id: "a", name: "Cedar Lake", waterType: "lake", notes: "", bestConditions: "Overcast", place: { lat: 45, lng: -93 } },
    { id: "b", name: "Cedar lake", waterType: "lake", notes: "Weed edge", bestConditions: "Calm" },
    { id: "c", name: "Mill Creek", waterType: "river", notes: "", bestConditions: "" },
  ],
  trips: [
    { id: "t1", date: "2026-05-01", title: "Dawn", spotId: "a", note: "" },
    { id: "t2", date: "2026-06-01", title: "Dusk", spotId: "c", note: "" },
  ],
  catches: [
    { id: "f1", species: "Pike", spotId: "a", tripId: "t1", caughtAt: "2026-05-01T06:00:00.000Z", lure: "Spoon", released: true, note: "" },
    { id: "f2", species: "Perch", spotId: "c", tripId: null, caughtAt: "2026-06-01T06:00:00.000Z", lure: "Jig", released: false, note: "" },
  ],
} as unknown as Logbook;

describe("mergeWaters", () => {
  it("moves the outings and fish over and drops the water", () => {
    const next = mergeWaters(book, "a", "b");
    expect(next.spots.map((spot) => spot.id)).toEqual(["b", "c"]);
    expect(next.trips.find((trip) => trip.id === "t1")?.spotId).toBe("b");
    expect(next.catches.find((entry) => entry.id === "f1")).toMatchObject({ spotId: "b", tripId: "t1" });
    expect(next.catches.find((entry) => entry.id === "f2")?.spotId).toBe("c");
  });

  it("keeps the kept water's own lines, filling only the blanks", () => {
    const kept = mergeWaters(book, "a", "b").spots.find((spot) => spot.id === "b")!;
    expect(kept).toMatchObject({ notes: "Weed edge", bestConditions: "Calm", place: { lat: 45, lng: -93 } });
    const other = mergeWaters(book, "b", "a").spots.find((spot) => spot.id === "a")!;
    expect(other).toMatchObject({ notes: "Weed edge", bestConditions: "Overcast", place: { lat: 45, lng: -93 } });
  });

  it("leaves the book alone for a missing or same water", () => {
    expect(mergeWaters(book, "a", "a")).toBe(book);
    expect(mergeWaters(book, "x", "a")).toBe(book);
  });
});
