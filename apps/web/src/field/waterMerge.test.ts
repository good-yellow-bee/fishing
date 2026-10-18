import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { mergeMoves, mergeWaters } from "./waterMerge";

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

describe("an untitled outing in a merge", () => {
  it("takes the kept water's name instead of keeping the old one's", () => {
    const named = { ...book, trips: [...book.trips, { id: "t4", date: "2026-07-01", title: "Mill Creek", spotId: "c", note: "" }] } as Logbook;
    const next = mergeWaters(named, "c", "a");
    expect(next.trips.find((trip) => trip.id === "t4")).toMatchObject({ spotId: "a", title: "Cedar Lake" });
    expect(next.trips.find((trip) => trip.id === "t2")).toMatchObject({ spotId: "a", title: "Dusk" });
  });
});

describe("merging a day out logged twice", () => {
  it("folds the moved outing into the kept water's outing of the same day, with its fish, counts and note", () => {
    const twice = {
      ...book,
      trips: [...book.trips, { id: "t3", date: "2026-05-01", title: "Cedar lake", spotId: "b", note: "Fog early", lost: 1 }],
      catches: [...book.catches, { ...book.catches[0]!, id: "f3", spotId: "b", tripId: "t3" }],
    } as Logbook;
    twice.trips[0] = { ...twice.trips[0]!, note: "Calm", lost: 2, missed: 1 };
    const next = mergeWaters(twice, "a", "b");
    expect(next.trips.map((trip) => trip.id)).toEqual(["t2", "t3"]);
    // The kept outing had only its water's name: the moved one's own title comes along.
    expect(next.trips.find((trip) => trip.id === "t3")).toMatchObject({ spotId: "b", title: "Dawn", note: "Fog early\nCalm", lost: 3, missed: 1 });
    expect(next.catches.filter((entry) => entry.tripId === "t3").map((entry) => entry.id).sort()).toEqual(["f1", "f3"]);
  });
});

describe("what a merge would move", () => {
  it("counts the outings and fish going over, and the outings joining one on their day", () => {
    const twice = { ...book, trips: [...book.trips, { id: "t3", date: "2026-05-01", title: "", spotId: "b", note: "" }] } as Logbook;
    expect(mergeMoves(book, "a", "b")).toEqual({ outings: book.trips.filter((trip) => trip.spotId === "a").length, fish: book.catches.filter((entry) => entry.spotId === "a").length, joined: 0 });
    expect(mergeMoves(twice, "a", "b").joined).toBe(1);
    expect(mergeMoves(book, "b", "a")).toEqual({ outings: 0, fish: 0, joined: 0 });
  });
});
