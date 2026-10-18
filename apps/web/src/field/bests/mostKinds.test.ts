import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { mostKindsDay } from "./mostKinds";

describe("mostKindsDay", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, day: number, species: string): CatchEntry => ({ ...base, id, species, caughtAt: new Date(2026, 9, day, 9).toISOString() });

  it("finds the day with the most kinds, the latest on a tie", () => {
    const catches = [fish("a", 3, "Pike"), fish("b", 3, "Perch"), fish("c", 3, "pike"), fish("d", 5, "Bass"), fish("e", 5, "Bluegill")];
    expect(mostKindsDay({ spots: [], trips: [], catches })).toEqual({ date: "2026-10-05", kinds: 2 });
  });

  it("counts a night session's small-hours fish on its outing's day, as the day search finds them", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const trip = { ...book.trips[0]!, id: "night", date: "2026-10-03" };
    const late = { ...fish("a", 4, "Pike"), tripId: "night", caughtAt: new Date(2026, 9, 4, 0, 30).toISOString() };
    const catches = [fish("b", 3, "Perch"), late, fish("c", 4, "Bream")];
    expect(mostKindsDay({ spots: [], trips: [trip], catches })).toEqual({ date: "2026-10-03", kinds: 2 });
  });

  it("says nothing when no day had two kinds", () => {
    expect(mostKindsDay({ spots: [], trips: [], catches: [fish("a", 3, "Pike"), fish("b", 3, "pike ")] })).toBeNull();
  });
});
