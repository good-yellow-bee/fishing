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
