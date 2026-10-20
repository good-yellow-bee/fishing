import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { catchesCsv } from "./catchCsv";

describe("round 113: a sheet of some of the book's fish", () => {
  it("dates a night fish by the whole book's day", () => {
    const night: CatchEntry = { id: "n", species: "Pike", measure: { kind: "length", inches: 30 }, lure: "Spoon", spotId: "a", tripId: null, caughtAt: new Date(2026, 9, 11, 1, 30).toISOString(), note: "", weather: null };
    const csv = catchesCsv({ spots: [], trips: [], catches: [night] }, { kindName: (name) => name, lureName: (name) => name, dayOf: () => "2026-10-10" });
    expect(csv).toContain("2026-10-10");
  });
});

import { recordHere } from "./RecordHere";

describe("round 113: an outing's largest", () => {
  it("goes by weight first, as the outing's own Largest names it", () => {
    const f = (id: string, measure: CatchEntry["measure"]): CatchEntry => ({ id, species: "Perch", measure, lure: "Jig", spotId: "a", tripId: "t", caughtAt: "2026-10-12T08:00:00.000Z", note: "", weather: null });
    const day = [f("zander", { kind: "length", inches: 20 }), f("perch", { kind: "weight", pounds: 0.6 })];
    const water = [...day, f("old", { kind: "weight", pounds: 2 }), f("old2", { kind: "length", inches: 30 })];
    expect(recordHere(day, water)?.largest.id).toBe("perch");
  });
});
