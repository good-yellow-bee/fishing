import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { t } from "../i18n";
import { smallHoursOn } from "./CatchSearch";
import { PLAY_LAKE_ID } from "./playLake";
import { yearSummary } from "./summaries";
import { tripsIcs } from "./tripIcs";
import { findTrips, tripDaySearch } from "./tripSearch";

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const ownLake = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const trip = (id: string, date: string, spotId = "own-lake"): Trip => ({ id, date, spotId, title: id, note: "" });
const fish = (id: string, caughtAt: string, tripId: string | null): CatchEntry => ({
  id,
  species: "Common carp",
  measure: { kind: "length", inches: 20 },
  lure: "Boilie",
  spotId: "own-lake",
  tripId,
  caughtAt,
  note: "",
  weather: null,
});

describe("round 84 ideas: a day searched whose fish count on the night before", () => {
  const book: Logbook = { spots: [ownLake], trips: [trip("night", "2026-10-10")], catches: [fish("a", local(2026, 10, 10, 23), "night"), fish("b", local(2026, 10, 11, 1, 30), "night")] };

  it("names the outing's day and how many went there", () => {
    expect(smallHoursOn(book, "2026-10-11")).toEqual({ count: 1, day: "2026-10-10" });
  });

  it("says nothing for the outing's own day, or for words", () => {
    expect(smallHoursOn(book, "2026-10-10")).toBeNull();
    expect(smallHoursOn(book, "pike")).toBeNull();
  });
});

describe("round 84 ideas: a calendar month's days out open its outings", () => {
  const book: Logbook = { spots: [ownLake, { ...ownLake, id: PLAY_LAKE_ID, name: "Stillwater" }], trips: [trip("a", "2026-10-02"), trip("b", "2026-10-20"), trip("c", "2026-09-30"), trip("g", "2026-10-05", PLAY_LAKE_ID)], catches: [] };

  it("leaves out the month's game rounds the calendar doesn't count, and finds the rest of the month", () => {
    const search = tripDaySearch(book, "2026-10", new Set(["a", "b", "c"]), t);
    expect(search).toBe("2026-10 -game");
    expect(findTrips(book, search, () => 0, "2026-10-19", t).map((found) => found.id).sort()).toEqual(["a", "b"]);
  });
});

describe("round 84 ideas: an outing sent to the calendar reminds the evening before", () => {
  it("adds a display alarm six hours before the all-day start", () => {
    const ics = tripsIcs([{ trip: trip("a", "2026-10-25"), place: null, alarm: "Pack for Pike, morning tomorrow" }], new Date(Date.UTC(2026, 9, 19)));
    expect(ics).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT6H\r\nDESCRIPTION:Pack for Pike\\, morning tomorrow\r\nEND:VALARM\r\nEND:VEVENT");
    expect(tripsIcs([{ trip: trip("a", "2026-10-25"), place: null }])).not.toContain("VALARM");
  });
});

describe("round 84 ideas: the year's copy says where its pace ends it", () => {
  const book: Logbook = { spots: [ownLake], trips: [], catches: Array.from({ length: 10 }, (_, i) => fish(`f${i}`, local(2026, 3, 1 + i, 10), null)) };

  it("for a year under way, short of its goal", () => {
    expect(yearSummary(book, "2026", "2026-07-02", 40)).toContain("On pace for 20 by the year's end");
  });

  it("not for a year gone by, or a goal reached", () => {
    expect(yearSummary(book, "2026", "2027-01-02", 40)).not.toContain("On pace");
    expect(yearSummary(book, "2026", "2026-07-02", 10)).not.toContain("On pace");
  });
});
