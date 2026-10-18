// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { busiestMonth } from "./bests/DayCalendar";
import { catchesCsv } from "./catchCsv";
import { YearGoal } from "./YearGoal";

// Node 26 has a localStorage of its own that is undefined without a file, in place of jsdom's.
function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const fish = (id: string, caughtAt: string, tripId: string | null = null) =>
  ({ id, species: "Zander", lure: "Jig", spotId: "home", tripId, caughtAt: new Date(caughtAt).toISOString(), measure: { kind: "length", inches: 20 }, note: "" }) as unknown as CatchEntry;

describe("round 78 ideas: the calendar marks its busiest month", () => {
  it("names the one month with the most days out", () => {
    expect(busiestMonth([["2026-09", 2], ["2026-10", 5]])).toBe("2026-10");
  });

  it("says nothing on a tie or for a single month", () => {
    expect(busiestMonth([["2026-09", 3], ["2026-10", 3]])).toBeNull();
    expect(busiestMonth([["2026-10", 4]])).toBeNull();
  });
});

describe("round 78 ideas: the catches spreadsheet gives a night fish its outing's day", () => {
  it("fills Outing day only when it differs from the clock's", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const book = {
      spots: [{ id: "home", name: "Home", waterType: "lake", notes: "", bestConditions: "" }],
      trips: [{ id: "nye", date: "2025-12-31", spotId: "home", title: "NYE", note: "" }],
      catches: [fish("late", "2026-01-01T00:40:00", "nye"), fish("day", "2025-12-31T22:10:00", "nye")],
    } as unknown as Logbook;
    const lines = catchesCsv(book).replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines[1]).toMatch(/^2026-01-01,00:40,2025-12-31,/);
    expect(lines[2]).toMatch(/^2025-12-31,22:10,,/);
  });
});

describe("round 78 ideas: Home's Set a goal opens the goal's form", () => {
  it("opens at once when the year has no goal", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const book = { spots: [], trips: [], catches: [] } as unknown as Logbook;
    expect(renderToStaticMarkup(<YearGoal book={book} openAtStart />)).toContain('name="goal"');
    expect(renderToStaticMarkup(<YearGoal book={book} />)).not.toContain('name="goal"');
  });
});
