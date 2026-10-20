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

describe("Trips after midnight, the edges", () => {
  const loose = (id: string, at: Date): CatchEntry => ({ ...fish(id, "x", at), tripId: null });

  it("ends a morning outing whose fish were logged loose on its water", () => {
    const book: Logbook = { spots: [], trips: [outing("morning", "2026-10-19")], catches: [loose("l", new Date(2026, 9, 19, 7, 0))] };
    expect(tripLists(book, new Date(2026, 9, 20, 1, 0)).recent.map((trip) => trip.id)).toEqual(["morning"]);
  });

  it("lets a blank evening give way to a plan for today, as Home does", () => {
    const book: Logbook = { spots: [], trips: [outing("eve", "2026-10-19"), outing("dawn", "2026-10-20")], catches: [] };
    const { upcoming, recent } = tripLists(book, new Date(2026, 9, 20, 2, 0));
    expect(upcoming.map((trip) => trip.id)).toEqual(["dawn"]);
    expect(recent.map((trip) => trip.id)).toEqual(["eve"]);
  });

  it("is yesterday's in Recent from 04:00", () => {
    const book: Logbook = { spots: [], trips: [outing("eve", "2026-10-19")], catches: [fish("e", "eve", new Date(2026, 9, 19, 23, 30))] };
    expect(tripLists(book, new Date(2026, 9, 20, 3, 59)).upcoming.map((trip) => trip.id)).toEqual(["eve"]);
    expect(tripLists(book, new Date(2026, 9, 20, 4, 0)).recent.map((trip) => trip.id)).toEqual(["eve"]);
  });

  it("puts today's round of the game in Recent", () => {
    const book: Logbook = { spots: [], trips: [{ ...outing("game", "2026-10-20"), spotId: "spot-stillwater" }], catches: [] };
    const { upcoming, recent } = tripLists(book, new Date(2026, 9, 20, 12, 0));
    expect(upcoming).toEqual([]);
    expect(recent.map((trip) => trip.id)).toEqual(["game"]);
  });
});
