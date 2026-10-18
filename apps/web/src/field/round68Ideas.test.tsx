import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { SeasonRecapBox } from "./bests/SeasonRecap";
import { YEAR_GOAL_KEY } from "./YearGoal";

const fish = (id: string, caughtAt: string): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own-lake",
  tripId: null,
  caughtAt,
  note: "",
  weather: null,
});
const book: Logbook = { spots: [], trips: [], catches: [fish("a", "2025-05-01T08:00:00.000Z"), fish("b", "2025-06-01T08:00:00.000Z"), fish("c", "2025-07-01T08:00:00.000Z")] };
const render = (year: string) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <SeasonRecapBox book={book} year={year} today="2026-10-18" />
    </MemoryRouter>,
  );

beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("round 68 ideas: a past season's goal", () => {
  it("says how a past season's goal ended", () => {
    localStorage.setItem(YEAR_GOAL_KEY, JSON.stringify({ "2025": 3 }));
    expect(render("2025")).toContain("Goal reached: 3 of 3 fish in 2025.");
    localStorage.setItem(YEAR_GOAL_KEY, JSON.stringify({ "2025": 10 }));
    expect(render("2025")).toContain("3 of 10 fish in 2025");
  });

  it("says nothing of a goal the season never had", () => {
    expect(render("2025")).not.toContain("of 10");
  });
});
