import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry, Trip } from "@stillwater/shared";
import { DayCalendar } from "./bests/DayCalendar";
import { SeasonRecapBox } from "./bests/SeasonRecap";
import { newWatersThisYear } from "./bests/notYet";
import { foldName, twinsTogether } from "./spotOrder";
import { renameInBook } from "./bookRename";

const spot = (id: string, name: string) => ({ id, name, waterType: "lake" as const, notes: "", bestConditions: "" });
const fish = (id: string, spotId: string, caughtAt: string, tripId: string | null = null): CatchEntry => ({
  id,
  species: "Perch",
  measure: { kind: "length", inches: 9 },
  lure: "Jig",
  spotId,
  tripId,
  caughtAt: new Date(caughtAt).toISOString(),
  note: "",
  weather: null,
});
const trip = (id: string, date: string, extra: Partial<Trip> = {}): Trip => ({ id, date, spotId: "a", title: "", note: "", ...extra }) as Trip;

describe("round 116 fixes: Bests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T19:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("counts a month's outings as the trip search does: not an evening still ahead on a day with fish, but one with only a lost fish", () => {
    const draw = (lost?: number) =>
      renderToStaticMarkup(
        <MemoryRouter>
          <DayCalendar
            book={{ spots: [spot("a", "Home Lake")], trips: [trip("past", "2026-10-04"), trip("dawn", "2026-10-18"), trip("dusk", "2026-10-18", lost ? { lost } : {})], catches: [fish("1", "a", "2026-10-04T09:00:00", "past"), fish("2", "a", "2026-10-18T07:00:00", "dawn")] }}
            year="2026"
            today="2026-10-18"
          />
        </MemoryRouter>,
      );
    expect(draw()).toContain("2 outings");
    expect(draw(1)).toContain("3 outings");
  });

  it("names the season's best water as most of its fish were logged, its twin waters together", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SeasonRecapBox book={{ spots: [spot("a", "sniardwy"), spot("b", "Śniardwy")], trips: [], catches: [fish("1", "a", "2026-08-20T08:00:00"), fish("2", "b", "2026-08-21T08:00:00"), fish("3", "b", "2026-08-22T08:00:00")] }} year="2026" today="2026-10-18" />
      </MemoryRouter>,
    );
    expect(html).toContain("Best water: Śniardwy (3)");
  });

  it("takes a water as new this year only when its twin had no fish before", () => {
    const names: Record<string, string> = { a: "Śniardwy", b: "Sniardwy", c: "Deep Lake" };
    const catches = [fish("1", "a", "2025-06-01T08:00:00"), fish("2", "b", "2026-06-01T08:00:00"), fish("3", "c", "2026-06-02T08:00:00")];
    expect(newWatersThisYear(catches, new Date(), undefined, (id) => foldName(names[id]!))).toEqual(["c"]);
    expect(newWatersThisYear(catches, new Date())).toEqual(["b", "c"]);
  });

  it("adds twin waters' fish together under the busier twin's name", () => {
    expect(twinsTogether([{ name: "Home Lake", count: 3 }, { name: "Deep Lake", count: 4 }, { name: "home  lake", count: 2 }, { name: null, count: 9 }])).toEqual([
      { name: "Home Lake", count: 5 },
      { name: "Deep Lake", count: 4 },
    ]);
  });

  it("joins a kind into the very spelling it is offered under, not a stray one in another case", () => {
    const catches = [fish("1", "a", "2026-06-01T08:00:00"), { ...fish("2", "a", "2026-06-01T09:00:00"), species: "perch" }, { ...fish("3", "a", "2026-06-01T10:00:00"), species: "Okoń" }];
    const result = renameInBook({ spots: [spot("a", "Home Lake")], trips: [], catches: [catches[1]!, catches[0]!, catches[2]!] }, "species", "Okoń", "Perch");
    expect(result.ok && result.book.catches.map((entry) => entry.species)).toEqual(["perch", "Perch", "Perch"]);
  });
});
