import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { recentTemp } from "./SpotPages";
import { bookFishDay } from "./tripMonths";
import { bestLureAt } from "./waterLure";
import { waterTips } from "./waterTips";

const local = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).toISOString();
const fish = (id: string, caughtAt: string, over: Partial<CatchEntry> = {}): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own",
  tripId: null,
  caughtAt,
  note: "",
  weather: null,
  ...over,
});

describe("round 93: a lure written two ways is one lure on a water", () => {
  const catches = [
    fish("a", local(2026, 10, 1, 8)),
    fish("b", local(2026, 10, 2, 8)),
    fish("c", local(2026, 10, 3, 8)),
    fish("d", local(2026, 10, 4, 8), { lure: "Spinnerbait" }),
    fish("e", local(2026, 10, 5, 8), { lure: "Spinnerbait" }),
    fish("f", local(2026, 10, 6, 8), { lure: "Spinnerbaits" }),
  ];

  it("counts the spellings together in the tips and leaves a tie without a best lure", () => {
    expect(waterTips(catches)!.lures.slice(0, 2)).toEqual([
      { lure: "Jig", count: 3 },
      { lure: "Spinnerbait", count: 3 },
    ]);
    expect(bestLureAt(catches, "own")).toBeNull();
  });
});

describe("round 93: a night's after-midnight water reading", () => {
  it("is dated on the card by its outing's day", () => {
    const book: Logbook = {
      spots: [],
      trips: [{ id: "n", date: "2026-10-10", spotId: "own", title: "", note: "" }],
      catches: [fish("late", local(2026, 10, 11, 1), { tripId: "n", weather: { waterTempF: 51 } as CatchEntry["weather"] })],
    };
    expect(recentTemp(book.catches, "own", "2026-10-19", (entry) => bookFishDay(book, entry))).toEqual({ fahrenheit: 51, day: "2026-10-10" });
  });
});
