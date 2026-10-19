// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { MonthYearTable } from "./bests/MonthYearTable";
import { recordStood } from "./bests/recordStood";

const fish = (id: string, caughtAt: string): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 10 }, lure: "Jig", spotId: "own", tripId: null, caughtAt, note: "", weather: null });

describe("round 104 ideas: the best month ever", () => {
  it("names it above the table, of two as good the first", () => {
    const catches = [fish("a", "2024-05-10T08:00:00.000Z"), fish("b", "2024-05-11T08:00:00.000Z"), fish("c", "2025-06-10T08:00:00.000Z"), fish("d", "2025-06-11T08:00:00.000Z"), fish("e", "2025-07-01T08:00:00.000Z")];
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MonthYearTable catches={catches} today={new Date(2026, 9, 19)} />
      </MemoryRouter>,
    );
    expect(html).toMatch(/Best month ever: May 2024 · 2 fish/);
  });
});

describe("round 104 ideas: how long a record has stood", () => {
  it("says nothing for a month, then days, then years", () => {
    expect(recordStood("2026-10-01", "2026-10-19")).toBe("");
    expect(recordStood("2026-05-01", "2027-03-01")).toBe("304 days ago");
    expect(recordStood("2023-06-01", "2026-10-19")).toBe("3 years ago");
    expect(recordStood("2027-01-01", "2026-10-19")).toBe("");
  });
});
