// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { sampleLogbook } from "@stillwater/shared";
import { findCatches } from "./CatchSearch";
import { canGoBack } from "./FieldShell";
import { sheetOutings } from "./catchCsv";
import { countedBook } from "./milestones";
import { searchSummary } from "./summaries";
import { bookFishDay, daysOut, monthTally, yearTally } from "./tripMonths";

const spot = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" };
const fish = (id: string, caughtAt: string, tripId?: string) =>
  ({ id, caughtAt: new Date(caughtAt).toISOString(), spotId: "own-lake", species: "Zander", lure: "Jig", measure: { kind: "length", value: 20, unit: "in" }, released: false, note: "", ...(tripId ? { tripId } : {}) }) as unknown as CatchEntry;

// A New Year's Eve night session: one fish before midnight, two after.
const nye = {
  spots: [spot],
  trips: [{ id: "nye", date: "2026-12-31", spotId: "own-lake", title: "", note: "" }],
  catches: [fish("a", "2026-12-31T22:00:00"), fish("b", "2027-01-01T00:30:00", "nye"), fish("c", "2027-01-01T01:10:00", "nye")].map((entry, index) =>
    index === 0 ? ({ ...entry, tripId: "nye" } as CatchEntry) : entry,
  ),
} as unknown as Logbook;

describe("round 72: a season counts a night session's small hours on its outing's day", () => {
  it("files the fish after midnight under the outing's year and month", () => {
    const monthOf = (entry: CatchEntry) => bookFishDay(nye, entry).slice(0, 7);
    expect(yearTally(nye.catches, monthOf)).toEqual([{ year: "2026", count: 3 }]);
    expect(monthTally(nye.catches, 13, monthOf)).toEqual([{ month: "2026-12", count: 3 }]);
    // By the clock alone, as before, the new year would get two.
    expect(yearTally(nye.catches).map((row) => row.year)).toEqual(["2027", "2026"]);
  });

  it("finds them under the outing's year and month in the search the bars open", () => {
    const say = (text: string) => text;
    expect(findCatches(nye, "2026", say).map((entry) => entry.id).sort()).toEqual(["a", "b", "c"]);
    expect(findCatches(nye, "2026-12", say)).toHaveLength(3);
    expect(findCatches(nye, "2027-01", say)).toHaveLength(0);
  });

  it("gives each fish of a copied search its time, so the small hours read as such", () => {
    const text = searchSummary(["2026-12-31"], nye.catches, () => null);
    expect(text).toMatch(/12:30 AM Zander/);
  });
});

describe("round 72: the sample week goes whole with the first outing of the angler's own", () => {
  it("leaves out the sample's fish once a planned outing is in the book", () => {
    const sample = sampleLogbook(new Date(2026, 9, 18, 10));
    const book = { ...sample, spots: [...sample.spots, spot], trips: [...sample.trips, { id: "mine", date: "2026-10-25", spotId: "own-lake", title: "", note: "" }] } as Logbook;
    expect(countedBook(book).catches).toEqual([]);
    expect(countedBook(book).trips.map((trip) => trip.id)).toEqual(["mine"]);
    expect(daysOut(countedBook(book), "2026", "2026-10-18")).toBe(0);
    // A new book still shows the sample week whole.
    expect(countedBook(sample).catches.length).toBe(sample.catches.length);
  });
});

describe("round 72: the outings spreadsheet leaves today's outing out until its first fish", () => {
  it("keeps today's outing with a fish and leaves out the one still ahead", () => {
    const book = {
      spots: [spot],
      trips: [
        { id: "ahead", date: "2026-10-18", spotId: "own-lake", title: "", note: "" },
        { id: "on", date: "2026-10-18", spotId: "own-lake", title: "", note: "" },
        { id: "past", date: "2026-10-10", spotId: "own-lake", title: "", note: "" },
      ],
      catches: [fish("x", "2026-10-18T09:00:00", "on")],
    } as unknown as Logbook;
    expect(sheetOutings(book, "2026-10-18").trips.map((trip) => trip.id).sort()).toEqual(["on", "past"]);
  });
});

describe("round 72: a Back stays in the app only with a page of ours under it", () => {
  afterEach(() => window.history.replaceState(null, ""));
  it("reads the router's entry number", () => {
    window.history.replaceState({ idx: 0 }, "");
    expect(canGoBack()).toBe(false);
    window.history.replaceState({ idx: 2 }, "");
    expect(canGoBack()).toBe(true);
  });
});
