import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { smallHoursOn } from "./CatchSearch";

const css = readFileSync(`${import.meta.dirname}/field.css`, "utf8");
const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const own = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const fish = (id: string, caughtAt: string): CatchEntry => ({ id, species: "Zander", measure: { kind: "length", inches: 20 }, lure: "Jig", spotId: "own-lake", tripId: "night", caughtAt, note: "", weather: null });

describe("round 86: the night hint reads a day however the search reads one", () => {
  const book: Logbook = { spots: [own], trips: [{ id: "night", date: "2026-10-10", spotId: "own-lake", title: "", note: "" }], catches: [fish("a", local(2026, 10, 10, 23)), fish("b", local(2026, 10, 11, 0, 40))] };
  const now = new Date(2026, 9, 19, 10);

  it("as the cards write it, or in Polish", () => {
    for (const typed of ["2026-10-11", "Oct 11", "11 października"]) expect(smallHoursOn(book, typed, now), typed).toEqual({ count: 1, day: "2026-10-10", on: "2026-10-11" });
  });

  it("not for a span of days", () => {
    expect(smallHoursOn(book, "last week", now)).toBeNull();
  });
});

describe("round 86: a card's stamps drop under a kind's name rather than cut it", () => {
  it("wraps the card's top row, and a long one-word kind in its fish line", () => {
    expect(css).toMatch(/\.spot-card-top \{[^}]*flex-wrap: wrap;/);
    expect(css).toMatch(/\.spot-card-top > :first-child \{[^}]*flex: 1 1 9ch;/);
    expect(css).toMatch(/\.spot-card > \.meta \{[^}]*overflow-wrap: anywhere;/);
  });
});
