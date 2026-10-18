import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";
import { getUnits, reloadLang, setLang, setUnits } from "../i18n";
import { catchesCsv, tripsCsv } from "./catchCsv";
import { PLAY_LAKE_ID } from "./playLake";
import { yearSummary } from "./summaries";

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const ownLake = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const trip = (id: string, date: string, spotId = "own-lake"): Trip => ({ id, date, spotId, title: id, note: "" });
const fish = (id: string, caughtAt: string, tripId: string | null, spotId = "own-lake", waterTempF?: number): CatchEntry => ({
  id,
  species: "Common carp",
  measure: { kind: "length", inches: 20 },
  lure: "Boilie",
  spotId,
  tripId,
  caughtAt,
  note: "",
  weather: waterTempF === undefined ? null : { sky: "clear", wind: "calm", waterTempF },
});

afterEach(() => {
  setLang("en");
  reloadLang();
});

describe("round 66: a year's count", () => {
  // A New Year's Eve session: one fish before midnight, two in the small hours of 1 January.
  const book: Logbook = {
    spots: [ownLake],
    trips: [trip("nye", "2026-12-31")],
    catches: [fish("a", local(2026, 12, 31, 22), "nye"), fish("b", local(2027, 1, 1, 0, 30), "nye"), fish("c", local(2027, 1, 1, 1, 10), "nye")],
  };

  it("counts a night session's small hours in its outing's year, as the calendar does", () => {
    expect(yearSummary(book, "2026", "2027-01-20", null).split("\n")[1]).toMatch(/^3 fish/);
    expect(yearSummary(book, "2027", "2027-01-20", 10).split("\n")[1]).toMatch(/^Nothing logged/);
  });

  it("says the goal is reached once the count gets there", () => {
    expect(yearSummary(book, "2026", "2027-01-20", 3)).toContain("Goal reached: 3 of 3 fish in 2026.");
    expect(yearSummary(book, "2026", "2027-01-20", 4)).toContain("3 of 4 fish in 2026");
  });
});

describe("round 66: spreadsheets", () => {
  it("leaves the game's rounds, the sample week and planned days out of the outings", () => {
    const sample = sampleLogbook(new Date(2026, 9, 15));
    const book: Logbook = {
      spots: [...sample.spots, ownLake],
      trips: [...sample.trips, trip("own", "2026-10-17"), trip("round", "2026-10-16", PLAY_LAKE_ID), trip("later", "2026-10-25")],
      catches: [...sample.catches, fish("own-1", local(2026, 10, 17, 9), "own")],
    };
    const lines = tripsCsv(book, "2026-10-18").replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines.slice(1).map((line) => line.split(",")[1])).toEqual(["own"]);
  });

  it("writes water at freezing as 0, never -0", () => {
    setLang("pl");
    const units = getUnits();
    setUnits("metric");
    const book: Logbook = { spots: [], trips: [], catches: [fish("cold", local(2026, 1, 5, 9), null, "own-lake", 31.95)] };
    const row = catchesCsv(book).replace(/^﻿/, "").trimEnd().split("\r\n")[1]!;
    expect(row.split(";")).toContain("0");
    expect(row.split(";")).not.toContain("-0");
    setUnits(units);
  });
});
