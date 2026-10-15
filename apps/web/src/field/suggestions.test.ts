import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { bookLures, ownFirst, tripLure } from "./suggestions";

describe("suggest the player's own names first", () => {
  it("puts own names first and drops repeats whatever their case", () => {
    expect(ownFirst(["Green tube", "Bobber"], ["bobber", "Spinner", "green Tube", "Jig"])).toEqual(["Green tube", "Bobber", "Spinner", "Jig"]);
  });

  it("shows names in the reader's language before comparing them", () => {
    const pl: Record<string, string> = { Bobber: "Spławik" };
    expect(ownFirst(["Spławik"], ["Bobber", "Jig"], (name) => pl[name] ?? name)).toEqual(["Spławik", "Jig"]);
  });

  it("knows the book's lures and the last lure used on a trip", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    expect(bookLures(book).length).toBeGreaterThan(0);
    const newest = [...book.catches].filter((entry) => entry.tripId).sort((a, b) => b.caughtAt.localeCompare(a.caughtAt))[0]!;
    expect(tripLure(book, newest.tripId!)).toBe(newest.lure);
    expect(tripLure(book, undefined)).toBe("");
  });
});
