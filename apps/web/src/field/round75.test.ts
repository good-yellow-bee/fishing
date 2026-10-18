import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { nextRealTrips } from "./bookCopy";
import { addedWater, forgetAddedWater, noteAddedWater } from "./addedWater";

const book = {
  spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }],
  trips: [
    { id: "morning", date: "2026-10-18", spotId: "own", title: "Morning", note: "" },
    { id: "evening", date: "2026-10-18", spotId: "own", title: "Evening", note: "" },
    { id: "sat", date: "2026-10-24", spotId: "own", title: "Next Sat", note: "" },
  ],
  catches: [{ id: "f1", caughtAt: "2026-10-18T06:30:00.000Z", spotId: "own", tripId: "morning", species: "Zander", measure: { kind: "length", inches: 20 }, released: false, note: "", lure: "Jig" }],
} as unknown as Logbook;

describe("round 75: the next outing is one still to start", () => {
  it("passes over today's outing once it has a fish, and keeps today's still unfished", () => {
    expect(nextRealTrips(book, "2026-10-18").map((trip) => trip.id)).toEqual(["evening", "sat"]);
  });
});

describe("round 75: a water added from a form waits for that form", () => {
  it("is held until the form lets it go", () => {
    noteAddedWater("new-water");
    expect(addedWater()).toBe("new-water");
    forgetAddedWater();
    expect(addedWater()).toBeNull();
  });
});
