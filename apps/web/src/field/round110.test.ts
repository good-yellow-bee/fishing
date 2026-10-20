import { describe, expect, it } from "vitest";
import { personalBests, type CatchEntry, type Logbook } from "@stillwater/shared";
import { recordStood } from "./bests/recordStood";
import { sheetOutings } from "./catchCsv";

const fish = (id: string, spotId: string, tripId: string | null = null, caughtAt = "2026-08-20T08:00:00.000Z"): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId, tripId, caughtAt, note: "", weather: null });

describe("round 110: a record's age", () => {
  it("counts whole calendar years", () => {
    expect(recordStood("2025-05-01", "2027-05-01")).toBe("2 years ago");
    expect(recordStood("2025-05-01", "2027-04-30")).toBe("1 year ago");
  });
});

describe("round 110: outings counted in the small hours", () => {
  it("take today's under way though last evening's day is the one still counted", () => {
    const book: Logbook = { spots: [], trips: [{ id: "eve", date: "2026-10-19", spotId: "own", title: "", note: "" }, { id: "now", date: "2026-10-20", spotId: "own", title: "", note: "" }, { id: "plan", date: "2026-10-20", spotId: "far", title: "", note: "" }], catches: [fish("e", "own", "eve"), fish("n", "own", "now", new Date(2026, 9, 20, 0, 30).toISOString())] };
    expect(sheetOutings(book, "2026-10-19").trips.map((trip) => trip.id).sort()).toEqual(["eve", "now"]);
  });
});

describe("round 110: waters with the same count", () => {
  it("sort by their name as it reads", () => {
    const book: Logbook = { spots: [{ id: "pine", name: "  Pine   Pond ", waterType: "pond", notes: "", bestConditions: "" }, { id: "deep", name: "Deep Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [], catches: [fish("a", "pine"), fish("b", "deep")] };
    expect(personalBests(book).waters.map((row) => row.spotId)).toEqual(["deep", "pine"]);
  });
});
