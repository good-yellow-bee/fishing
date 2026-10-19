import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Trip } from "@stillwater/shared";
import { yearSummary } from "./summaries";

const ownLake = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const trip = (id: string, date: string): Trip => ({ id, date, spotId: "own-lake", title: id, note: "" });
const fish = (id: string, caughtAt: string, tripId: string | null): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own-lake",
  tripId,
  caughtAt,
  note: "",
  weather: null,
});

describe("round 90 ideas: the year's copy counts its outings", () => {
  const book: Logbook = {
    spots: [ownLake],
    trips: [trip("a", "2026-09-01"), trip("b", "2026-10-02"), trip("old", "2025-10-02"), trip("plan", "2026-11-01")],
    catches: [fish("1", new Date(2026, 8, 1, 9).toISOString(), "a")],
  };

  it("fished ones only, not a plan still ahead or another year's", () => {
    expect(yearSummary(book, "2026", "2026-10-19", null).split("\n")).toContain("Outings: 2");
    expect(yearSummary(book, "2024", "2026-10-19", null)).not.toContain("Outings");
  });
});
