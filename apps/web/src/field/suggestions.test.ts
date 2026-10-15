import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { bookLures, lastMeasureKind, ownFirst, tripLure } from "./suggestions";

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

describe("the measure a new catch starts with", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const fish = (id: string, kind: "length" | "weight", caughtAt: string, spotId = "spot-mill") => ({
    ...book.catches[0]!,
    id,
    spotId,
    caughtAt,
    measure: kind === "length" ? { kind, inches: 12 } : { kind, pounds: 2 },
  });

  it("starts with length when the player has logged nothing by hand", () => {
    expect(lastMeasureKind(book)).toBe("length");
    expect(lastMeasureKind({ ...book, catches: [...book.catches, fish("game", "weight", "2026-10-20T08:00:00", "spot-stillwater")] })).toBe("length");
  });

  it("follows the player's newest fish logged by hand", () => {
    const own = { ...book, catches: [...book.catches, fish("old", "length", "2026-10-18T08:00:00"), fish("new", "weight", "2026-10-19T08:00:00")] };
    expect(lastMeasureKind(own)).toBe("weight");
  });
});
