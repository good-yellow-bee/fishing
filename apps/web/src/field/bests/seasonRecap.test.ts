import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { seasonRecap } from "./seasonRecap";

describe("a season against the one before", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, species: string, iso: string): CatchEntry => ({ ...base, id, species, caughtAt: iso, tripId: null });
  const book = {
    spots: [],
    trips: [],
    catches: [
      fish("a", "Pike", "2025-06-01T09:00:00"),
      fish("b", "Perch", "2025-06-02T09:00:00"),
      fish("c", "pike", "2026-05-01T09:00:00"),
      fish("d", "Walleye", "2026-05-01T10:00:00"),
      fish("e", "Burbot", "2026-07-03T09:00:00"),
    ],
  };

  it("counts fish, days and kinds for both seasons, and names the kinds new to the book", () => {
    expect(seasonRecap(book, "2026", "2026-10-16")).toEqual({
      year: "2026",
      before: "2025",
      fish: 3,
      fishBefore: 2,
      days: 2,
      daysBefore: 2,
      kinds: 3,
      kindsBefore: 2,
      newKinds: ["Walleye", "Burbot"],
    });
  });

  it("calls every kind new in the book's first season", () => {
    expect(seasonRecap(book, "2025", "2026-10-16").newKinds).toEqual(["Pike", "Perch"]);
  });
});
