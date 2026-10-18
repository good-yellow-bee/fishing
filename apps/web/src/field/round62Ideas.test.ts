import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { daysBetween, lastOutByWater } from "./spotOrder";
import { yearTally } from "./tripMonths";
import { largestFirst } from "./largestFirst";

const fish = (id: string, at: string, inches: number): CatchEntry => ({ id, species: "Walleye", measure: { kind: "length", inches }, lure: "Jig", spotId: "w", tripId: null, caughtAt: at, note: "", weather: null });
const trip = (id: string, date: string): Trip => ({ id, date, spotId: "w", title: "", note: "" });

describe("round 62 water page ideas", () => {
  it("rests a water from its last outing or fish, leaving today's empty outing out", () => {
    const book = { spots: [], trips: [trip("old", "2026-10-01"), trip("today", "2026-10-15")], catches: [] } as unknown as Logbook;
    const last = lastOutByWater(book, "2026-10-15").get("w")!;
    expect(last).toBe("2026-10-01");
    expect(daysBetween(last, "2026-10-15")).toBe(14);
  });

  it("counts a water's fish year by year, newest first", () => {
    const catches = [fish("a", new Date(2026, 4, 2, 9).toISOString(), 18), fish("b", new Date(2025, 6, 1, 9).toISOString(), 22), fish("c", new Date(2026, 5, 1, 9).toISOString(), 15)];
    expect(yearTally(catches)).toEqual([
      { year: "2026", count: 2 },
      { year: "2025", count: 1 },
    ]);
    expect(largestFirst(catches).map((entry) => entry.id)).toEqual(["b", "a", "c"]);
  });
});
