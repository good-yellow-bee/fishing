import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { tripLists } from "./TripPages";

const outing = (id: string, date: string) => ({ id, date, spotId: "own", title: "", note: "" });
const fish = (id: string, tripId: string, at: Date): CatchEntry => ({ id, species: "Pike", measure: { kind: "length", inches: 30 }, lure: "Jig", spotId: "own", tripId, caughtAt: at.toISOString(), note: "", weather: null });

describe("Trips after midnight", () => {
  const book: Logbook = {
    spots: [{ id: "own", name: "Home Lake", waterType: "lake", notes: "", bestConditions: "" }],
    trips: [outing("dawn", "2026-10-19"), outing("eve", "2026-10-19"), outing("plan", "2026-10-22")],
    catches: [fish("d", "dawn", new Date(2026, 9, 19, 6, 30)), fish("e", "eve", new Date(2026, 9, 19, 23, 30))],
  };

  it("keeps last evening's session going under Coming up and puts yesterday's ended morning in Recent", () => {
    const { upcoming, recent } = tripLists(book, new Date(2026, 9, 20, 1, 0));
    expect(upcoming.map((trip) => trip.id)).toEqual(["eve", "plan"]);
    expect(recent.map((trip) => trip.id)).toEqual(["dawn"]);
  });
});
