import { describe, expect, it } from "vitest";
import type { Logbook, Trip } from "@stillwater/shared";
import { datePicks } from "./tripDates";
import { monthWord } from "./dateWords";
import { findTrips } from "./tripSearch";
import { tripNeighbors } from "./catchNeighbors";
import { PLAY_LAKE_ID } from "./playLake";

const trip = (id: string, date: string, spotId = "own", title = "") => ({ id, date, spotId, title, note: "" }) as Trip;
const id = (text: string) => text.split("|")[0]!;

describe("round 82: a night session's outing is dated by its evening", () => {
  it("offers last night first in the small hours, and not by day", () => {
    expect(datePicks(new Date(2026, 9, 11, 1, 30))[0]).toEqual({ label: "Last night", date: "2026-10-10" });
    expect(datePicks(new Date(2026, 9, 11, 9, 0))[0]!.label).toBe("Today");
  });
});

describe("round 82: the outing search reads more words", () => {
  const book = {
    spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }, { id: PLAY_LAKE_ID, name: "Stillwater", waterType: "lake", notes: "", bestConditions: "" }],
    trips: [trip("june", "2025-06-02"), trip("round", "2026-10-01", PLAY_LAKE_ID, "Dawn at the drop-off · clear"), trip("own2", "2026-10-03")],
    catches: [],
  } as unknown as Logbook;
  const find = (needle: string) => findTrips(book, needle, () => 0, "2026-10-18", id, new Date(2026, 9, 18, 12)).map((each) => each.id);

  it("reads “in june” as a month", () => {
    expect(monthWord("in june")).toBe(5);
    expect(find("in june")).toEqual(["june"]);
  });

  it("reads “game” alone as the game's rounds", () => {
    expect(find("game")).toEqual(["round"]);
  });
});

describe("round 82: two outings on one day step by their first fish", () => {
  const book = {
    spots: [],
    trips: [trip("b-dusk", "2026-09-20"), trip("a-dawn", "2026-09-20")],
    catches: [
      { id: "c1", tripId: "b-dusk", spotId: "own", caughtAt: "2026-09-20T18:00:00Z", species: "Pike", lure: "", note: "" },
      { id: "c2", tripId: "a-dawn", spotId: "own", caughtAt: "2026-09-20T05:00:00Z", species: "Pike", lure: "", note: "" },
    ],
  } as unknown as Logbook;

  it("puts the dawn before the dusk", () => {
    expect(tripNeighbors(book, "a-dawn", "2026-10-18").newer?.id).toBe("b-dusk");
  });
});
