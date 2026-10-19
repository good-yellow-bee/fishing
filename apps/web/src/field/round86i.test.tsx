import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { setLang } from "../i18n";
import { fishDays } from "./CatchSearch";
import { kindRates } from "./SpeciesPage";
import { MonthYearTable } from "./bests/MonthYearTable";
import { SeasonRecapBox } from "./bests/SeasonRecap";

const local = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).toISOString();
const fish = (id: string, species: string, caughtAt: string, tripId: string | null, spotId = "own-lake"): CatchEntry =>
  ({ id, species, measure: { kind: "length", inches: 20 }, lure: "Jig", spotId, tripId, caughtAt, note: "", weather: null }) as CatchEntry;
const trip = (id: string, date: string, spotId = "own-lake"): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;
const spots = [{ id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }, { id: "river", name: "River", waterType: "river", notes: "", bestConditions: "" }] as Logbook["spots"];

afterEach(() => setLang("en"));

describe("round 86 ideas: how many days and outings a search's fish came on", () => {
  it("counts a night's small hours on its outing's day, and only outings in the book", () => {
    const book: Logbook = { spots, trips: [trip("a", "2026-10-10"), trip("b", "2026-10-12")], catches: [] };
    const found = [fish("1", "Zander", local(2026, 10, 10, 22), "a"), fish("2", "Zander", local(2026, 10, 11, 1), "a"), fish("3", "Zander", local(2026, 10, 12, 8), "b"), fish("4", "Zander", local(2026, 10, 14, 8), "gone")];
    expect(fishDays({ ...book, catches: found }, found)).toEqual({ days: 3, outings: 2 });
  });
});

describe("round 86 ideas: how often a water's outings took a kind", () => {
  it("counts past outings and today's with a fish, not a plan ahead, once a water had two", () => {
    const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("c", "2026-10-08"), trip("d", "2026-10-19"), trip("e", "2026-10-25"), trip("r", "2026-10-02", "river")];
    const catches = [fish("1", "Pike", local(2026, 10, 1, 9), "a"), fish("2", "Perch", local(2026, 10, 5, 9), "b"), fish("3", "Pike", local(2026, 10, 19, 8), "d"), fish("4", "Pike", local(2026, 10, 2, 9), "r", "river")];
    const book: Logbook = { spots, trips, catches };
    const rates = kindRates(book, catches.filter((entry) => entry.species === "Pike"), "2026-10-19");
    expect(rates.get("own-lake")).toEqual({ count: 2, total: 4 });
    // One outing at the river says nothing about how reliable it is.
    expect(rates.has("river")).toBe(false);
  });
});

describe("round 86 ideas: the month-by-year table", () => {
  const catches = [
    fish("1", "Pike", local(2025, 5, 3, 9), null),
    fish("2", "Pike", local(2025, 6, 3, 9), null),
    fish("3", "Pike", local(2025, 6, 4, 9), null),
    fish("4", "Pike", local(2026, 4, 3, 9), null),
  ];

  it("adds each year's total, and marks a year's best month once it had fish in two", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MonthYearTable catches={catches} today={new Date(2026, 9, 19)} />
      </MemoryRouter>,
    );
    expect(html).toContain("<tfoot>");
    expect(html).toMatch(/aria-label="2025: 3 fish"[^>]*>3</);
    expect(html).toMatch(/aria-label="2026: 1 fish"[^>]*>1</);
    expect(html).toContain("June 2025: 2 fish, the best month that year");
    expect(html.match(/month-year-top/g)).toHaveLength(1);
  });

  it("says it in Polish", () => {
    setLang("pl");
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MonthYearTable catches={catches} today={new Date(2026, 9, 19)} />
      </MemoryRouter>,
    );
    expect(html).toContain("Razem");
    expect(html).toContain("najlepszy miesiąc tego roku");
  });
});

describe("round 86 ideas: a season's recap opens what it counts", () => {
  it("links the fish and days, and jumps to the kinds", () => {
    const book: Logbook = { spots, trips: [trip("a", "2025-06-03")], catches: [fish("1", "Pike", local(2025, 6, 3, 9), "a")] };
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SeasonRecapBox book={book} year="2025" today="2026-10-19" fishLink="/catches?find=2025" daysLink="/trips?find=2025" kindsId="by-species" />
      </MemoryRouter>,
    );
    expect(html).toContain('<a href="/catches?find=2025" data-discover="true">Fish: 1</a>');
    expect(html).toContain('<a href="/trips?find=2025" data-discover="true">Days out: 1</a>');
    expect(html).toContain('<a href="#by-species">Kinds: 1</a>');
  });
});
