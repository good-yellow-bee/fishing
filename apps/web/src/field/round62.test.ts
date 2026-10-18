import { describe, expect, it } from "vitest";
import type { CatchEntry, Trip } from "@stillwater/shared";
import { notesHere } from "./outingNotes";
import { notYetThisYear } from "./bests/notYet";

const trip = (id: string, date: string, note: string): Trip => ({ id, date, spotId: "w", title: "", note });

describe("round 62 water page fixes", () => {
  it("leaves today's plan note out until the outing has a fish", () => {
    const trips = [trip("past", "2026-10-10", "Weed edge"), trip("today", "2026-10-15", "Try the jig")];
    expect(notesHere(trips, "2026-10-15").map((row) => row.trip.id)).toEqual(["past"]);
    expect(notesHere(trips, "2026-10-15", 3, (id) => (id === "today" ? 1 : 0)).map((row) => row.trip.id)).toEqual(["today", "past"]);
  });

  it("dates a kind's fish by the day the page gives it", () => {
    const fish = (id: string, at: string): CatchEntry => ({ id, species: "Northern pike", measure: { kind: "length", inches: 20 }, lure: "Spoon", spotId: "w", tripId: null, caughtAt: at, note: "", weather: null });
    const night = [fish("a", new Date(2026, 0, 1, 0, 40).toISOString())];
    expect(notYetThisYear(night, new Date(2026, 5, 1))).toEqual([]);
    expect(notYetThisYear(night, new Date(2026, 5, 1), undefined, () => "2025-12-31")).toEqual(["Northern pike"]);
  });
});
