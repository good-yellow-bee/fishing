import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { setLang } from "../i18n";
import { SeasonRecapBox } from "./bests/SeasonRecap";
import { dateWords } from "./dateWords";

const local = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).toISOString();
const fish = (id: string, caughtAt: string, tripId: string | null): CatchEntry =>
  ({ id, species: "Pike", measure: { kind: "length", inches: 20 }, lure: "Jig", spotId: "own-lake", tripId, caughtAt, note: "", weather: null }) as CatchEntry;
const trip = (id: string, date: string): Trip => ({ id, date, spotId: "own-lake", title: "", note: "" }) as Trip;
const spots = [{ id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }] as Logbook["spots"];

afterEach(() => setLang("en"));

describe("round 92 ideas: fish an outing in the season box", () => {
  const book: Logbook = {
    spots,
    trips: [trip("a", "2025-06-01"), trip("b", "2025-07-01"), trip("c", "2026-06-01"), trip("d", "2026-07-01"), trip("e", "2026-12-01")],
    catches: [fish("1", local(2025, 6, 1, 9), "a"), fish("2", local(2026, 6, 1, 9), "c"), fish("3", local(2026, 6, 1, 10), "c"), fish("4", local(2026, 7, 1, 9), "d")],
  };
  const render = () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <SeasonRecapBox book={book} year="2026" today="2026-10-19" />
      </MemoryRouter>,
    );

  it("sets the season's rate against the one before by this date, leaving out the plan ahead", () => {
    expect(render()).toContain("Fish an outing: 1.5, up from 0.5 in 2025 by this date");
  });

  it("says it in Polish", () => {
    setLang("pl");
    expect(render()).toContain("Ryb na wyprawę: 1,5, więcej niż 0,5 w 2025 do tego dnia");
  });
});

describe("round 92 ideas: a day and month without a year", () => {
  const now = new Date(2027, 0, 20, 12);
  it("reads 31.12 as the last New Year's Eve", () => {
    expect(dateWords("31.12", now)).toEqual({ from: "2026-12-31", to: "2026-12-31" });
    expect(dateWords("5.10.", now)).toEqual({ from: "2026-10-05", to: "2026-10-05" });
  });
  it("leaves a one-digit decimal as a word", () => {
    expect(dateWords("1.5", now)).toBeNull();
  });
});
