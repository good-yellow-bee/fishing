import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { withPlayFrom } from "./BookFile";
import { dayMarks } from "./bests/dayMarks";
import { catchesCsv } from "./catchCsv";
import { fishDays } from "./CatchSearch";
import { PLAY_LAKE_ID } from "./playLake";
import { tripsIcs } from "./tripIcs";
import { bookFishDay, daysOut } from "./tripMonths";

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const ownLake = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const trip = (id: string, date: string, title = "", spotId = "own-lake"): Trip => ({ id, date, spotId, title, note: "" });
const fish = (id: string, caughtAt: string, tripId: string | null, spotId = "own-lake"): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId,
  tripId,
  caughtAt,
  note: "",
  weather: null,
});

describe("round 90: a night session's small-hours fish logged without its outing", () => {
  const book: Logbook = {
    spots: [ownLake],
    trips: [trip("n1", "2026-10-10", "Night bass")],
    catches: [fish("a", local(2026, 10, 10, 23, 30), "n1"), fish("b", local(2026, 10, 11, 1, 10), "n1"), fish("loose", local(2026, 10, 11, 2), null)],
  };

  it("counts on the evening's outing day, making no second day out", () => {
    expect(bookFishDay(book, book.catches[2]!)).toBe("2026-10-10");
    expect(daysOut(book, "2026", "2026-10-19")).toBe(1);
    expect(dayMarks(book, "2026").has("2026-10-11")).toBe(false);
    expect(fishDays(book, book.catches).days).toBe(1);
  });

  it("but not with no outing that evening on its water", () => {
    const apart = { ...book, catches: [...book.catches, fish("far", local(2026, 10, 11, 2), null, "east")] };
    expect(bookFishDay(apart, apart.catches[3]!)).toBe("2026-10-11");
  });
});

describe("round 90: Replace keeps this browser's game", () => {
  it("carries the lake, its rounds and fish, and their snapshots over a file without them", () => {
    const here: Logbook = {
      spots: [ownLake, { ...ownLake, id: PLAY_LAKE_ID, name: "Stillwater" }],
      trips: [trip("g", "2026-10-05", "", PLAY_LAKE_ID)],
      catches: [fish("own", local(2026, 10, 5, 9), null), fish("gx", local(2026, 10, 5, 10), "g", PLAY_LAKE_ID)],
    };
    const file = { book: { spots: [ownLake], trips: [], catches: [fish("own", local(2026, 10, 5, 9), null)] }, tackle: [], photos: {} };
    const next = withPlayFrom(file, here, { gx: "data:image/jpeg;base64,AAAA" });
    expect(next.book.spots.map((spot) => spot.id)).toEqual(["own-lake", PLAY_LAKE_ID]);
    expect(next.book.trips.map((each) => each.id)).toEqual(["g"]);
    expect(next.book.catches.map((entry) => entry.id)).toEqual(["own", "gx"]);
    expect(Object.keys(next.photos)).toEqual(["gx"]);
  });
});

describe("round 90: exports", () => {
  it("name an untitled outing by its water in the catches sheet, as the outings sheet does", () => {
    const book: Logbook = { spots: [ownLake], trips: [trip("o2", "2026-09-26")], catches: [fish("a", local(2026, 9, 26, 8), "o2")] };
    expect(catchesCsv(book).split("\r\n")[1]).toBe("2026-09-26,08:00,,Zander,20,,Jig,Own Lake,Own Lake,,,,,");
  });

  it("leave out a packing alarm whose evening has already gone", () => {
    const at = (h: number, min = 0) => new Date(2026, 9, 23, h, min);
    const plan = [{ trip: trip("p", "2026-10-24", "Next Sat"), place: null, alarm: "Pack" }];
    expect(tripsIcs(plan, at(17))).toContain("VALARM");
    expect(tripsIcs(plan, at(21, 30))).not.toContain("VALARM");
  });
});
