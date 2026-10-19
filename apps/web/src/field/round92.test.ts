import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { setLang } from "../i18n";
import { pieceTally } from "./pieceTally";
import { sizeBands } from "./sizeBands";
import { speciesSummary } from "./summaries";
import { bookFishDay } from "./tripMonths";

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const trip = (id: string, date: string): Trip => ({ id, date, spotId: "own-lake", title: "", note: "" });
const fish = (id: string, caughtAt: string, over: Partial<CatchEntry> = {}): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own-lake",
  tripId: null,
  caughtAt,
  note: "",
  weather: null,
  ...over,
});

describe("round 92: a lure written two ways is one row", () => {
  it("sums the spellings under the commonest", () => {
    const catches = [
      fish("a", local(2026, 10, 1, 8), { lure: "Spinnerbait" }),
      fish("b", local(2026, 10, 2, 8), { lure: "spinnerbait " }),
      fish("c", local(2026, 10, 3, 8), { lure: "Spinnerbaits" }),
      fish("d", local(2026, 10, 4, 8), { lure: "Spoon" }),
      fish("e", local(2026, 10, 5, 8), { lure: "Spinnerbaits" }),
    ];
    expect(pieceTally(catches)).toEqual([
      { lure: "Spinnerbaits", count: 4 },
      { lure: "Spoon", count: 1 },
    ]);
  });
});

describe("round 92: every weighed fish lands in a size band", () => {
  it("counts a pound reading that rounds onto the first band's edge", () => {
    const catches = [1.1, 2.2046, 2.2046, 3.3, 4.41, 6.6].map((pounds, index) => fish(`w${index}`, local(2026, 9, index + 1, 8), { measure: { kind: "weight", pounds } }));
    const bands = sizeBands(catches, "weight", true);
    expect(bands.reduce((sum, band) => sum + band.count, 0)).toBe(6);
    expect(bands[0]!.from).toBe(0);
  });
});

describe("round 92: a kind's copied summary dates fish by their outing's day", () => {
  afterEach(() => setLang("en"));

  it("files a night fish's small hours on the evening it started", () => {
    setLang("en");
    const book: Logbook = {
      spots: [],
      trips: [trip("n", "2026-10-10")],
      catches: [fish("late", local(2026, 10, 11, 1), { tripId: "n" }), fish("early", local(2025, 12, 31, 22))],
    };
    const text = speciesSummary("Northern pike", book.catches, [], (entry) => bookFishDay(book, entry));
    expect(text).toContain("newest Sat, Oct 10, 2026");
  });
});
