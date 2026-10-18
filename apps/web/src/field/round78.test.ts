import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook, type Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { countedSearch } from "./countedSearch";
import { leaveDeleted, movedOnSince } from "./leaveDeleted";
import { PLAY_LAKE_ID } from "./playLake";
import { findTrips, tripDaySearch } from "./tripSearch";

const css = readFileSync(`${import.meta.dirname}/field.css`, "utf8");
const own = { id: "home", name: "Home Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const lake = { ...own, id: PLAY_LAKE_ID, name: "Stillwater" };

describe("round 78: a calendar day's outings leave out the game's and the sample's", () => {
  const sample = sampleLogbook(new Date(2026, 9, 18, 10));
  const day = sample.trips.find((trip) => trip.date < "2026-10-18")!.date;
  const trip = (id: string, spotId: string) => ({ id, date: day, spotId, title: "", note: "" });
  const book = { ...sample, spots: [...sample.spots, own, lake], trips: [...sample.trips, trip("a", "home"), trip("b", "home"), trip("g", PLAY_LAKE_ID)] } as Logbook;
  const kept = new Set(["a", "b"]);

  it("names what to leave out, and the search finds just the angler's two", () => {
    const search = tripDaySearch(book, day, kept, t);
    expect(search).toBe(`${day} -game -sample`);
    expect(findTrips(book, search, () => 0, "2026-10-18", t).map((found) => found.id).sort()).toEqual(["a", "b"]);
  });

  it("is the bare day when nothing is left out", () => {
    expect(tripDaySearch(book, day, new Set(book.trips.filter((found) => found.date === day).map((found) => found.id)), t)).toBe(day);
  });
});

describe("round 78: Home's year link counts as the goal does", () => {
  it("leaves the sample week out once the angler has an outing of their own, even before a fish", () => {
    const sample = sampleLogbook(new Date(2026, 9, 18, 10));
    const book = { ...sample, spots: [...sample.spots, own], trips: [...sample.trips, { id: "mine", date: "2026-10-25", spotId: "home", title: "", note: "" }] } as Logbook;
    expect(countedSearch(book, "this year", book.catches, "book")).toMatch(/-sample$/);
    expect(countedSearch(book, "this year", book.catches)).toBe("this year");
  });
});

describe("round 78: Undo pressed on another page since leaves that page in history", () => {
  beforeEach(() => vi.stubGlobal("window", { location: { pathname: "/trips/tb", search: "" }, history: { state: null } }));
  afterEach(() => vi.unstubAllGlobals());

  it("knows where the delete landed", () => {
    leaveDeleted(vi.fn(), null, "/trips");
    expect(movedOnSince("/trips/tb", "/trips")).toBe(false);
    expect(movedOnSince("/trips/tb", "/bests")).toBe(true);
    expect(movedOnSince("/catches/x", "/bests")).toBe(false);
  });
});

describe("round 78: the Undo bar raised over a form's save buttons", () => {
  it("has focus and the form's end scroll clear of it", () => {
    expect(css).toMatch(/html:has\(\.form-save\):has\(\.undo-bar\) \{\s*scroll-padding-bottom: calc\(92px \+ 80px\);/);
    expect(css).toMatch(/ {2}html:has\(\.form-save\):has\(\.undo-bar\) \{\s*scroll-padding-bottom: calc\(150px \+ 80px \+ env\(safe-area-inset-bottom\)\);/);
  });
});
