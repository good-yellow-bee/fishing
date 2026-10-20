import { describe, expect, it } from "vitest";
import type { Logbook, Trip } from "@stillwater/shared";
import { findTrips } from "./tripSearch";
import { sameDayFishTimes } from "./tripTimes";
import { PLAY_LAKE_ID } from "./playLake";

const trip = (id: string, title: string, note: string): Trip => ({ id, date: "2026-10-12", spotId: "a", title, note });

describe("round 112 ideas: outings by a note or by no title", () => {
  const book: Logbook = { spots: [{ id: "a", name: "Pine Pond", waterType: "pond", notes: "", bestConditions: "" }], trips: [trip("n", "Dawn", "Calm at first light."), trip("u", "", ""), trip("b", " ", " "), trip("w", "Pine Pond", "Field notes")], catches: [] };
  const ids = (needle: string) => findTrips(book, needle, () => 1, "2026-10-20", (text) => text).map((found) => found.id).sort();
  it("finds those with a write-up", () => {
    expect(ids("with a note")).toEqual(["n", "w"]);
    expect(ids("z notatką")).toEqual(["n", "w"]);
    // A word of a note is still a word search.
    expect(ids("notes")).toEqual(["w"]);
  });
  it("finds those never given a title", () => {
    // Saved under its water's name, as the form saves a blank title.
    expect(ids("untitled")).toEqual(["b", "u", "w"]);
    expect(ids("bez tytułu")).toEqual(["b", "u", "w"]);
  });
});

describe("round 112 ideas: when a day's two outings' fish came", () => {
  it("is known only for outings sharing their water and day, not the game's rounds", () => {
    const at = (id: string, tripId: string, iso: string) => ({ id, species: "Perch", measure: { kind: "length" as const, inches: 9 }, lure: "Jig", spotId: "a", tripId, caughtAt: iso, note: "", weather: null });
    const book: Logbook = {
      spots: [],
      trips: [trip("dawn", "Dawn", ""), trip("dusk", "", ""), { ...trip("g1", "", ""), spotId: PLAY_LAKE_ID }, { ...trip("g2", "", ""), spotId: PLAY_LAKE_ID }, { ...trip("other", "", ""), date: "2026-10-13" }],
      catches: [at("1", "dawn", "2026-10-12T05:40:00.000Z"), at("2", "dawn", "2026-10-12T05:00:00.000Z"), at("3", "dusk", "2026-10-12T17:00:00.000Z"), at("4", "g1", "2026-10-12T09:00:00.000Z"), at("5", "other", "2026-10-13T09:00:00.000Z")],
    };
    const times = sameDayFishTimes(book);
    expect(times.get("dawn")).toEqual({ first: "2026-10-12T05:00:00.000Z", last: "2026-10-12T05:40:00.000Z" });
    expect(times.has("dusk")).toBe(true);
    expect(times.has("g1")).toBe(false);
    expect(times.has("other")).toBe(false);
  });
});
