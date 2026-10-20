import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { catchBadge } from "./catchBadge";
import { largestFirst } from "./largestFirst";
import { likelyDuplicate } from "./likelyDuplicate";
import { milestoneOf } from "./milestones";
import { speciesCatches } from "./suggestions";

const fish = (id: string, species: string, measure: CatchEntry["measure"], extra: Partial<CatchEntry> = {}): CatchEntry => ({ id, species, measure, lure: "Jig", spotId: "own", tripId: null, caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null, ...extra });

describe("round 107: a kind however it was typed, on the catch pages", () => {
  it("gives the kind's best its badge across spellings", () => {
    const book: Logbook = { spots: [], trips: [], catches: [fish("big", "Perch", { kind: "length", inches: 12 }), fish("small", "perches", { kind: "length", inches: 9 }), fish("pike", "Pike", { kind: "length", inches: 30 })] };
    expect(catchBadge(book, book.catches[0]!)).toBe("species");
  });

  it("finds the kind's fish for the form's best so far, however it is typed", () => {
    const book: Logbook = { spots: [], trips: [], catches: [fish("a", "Perch", { kind: "length", inches: 12 })] };
    expect(speciesCatches(book, "perches").map((entry) => entry.id)).toEqual(["a"]);
  });

  it("sizes a length-only fish by its kind's pairs across spellings", () => {
    const pair = (id: string, inches: number, pounds: number) => fish(id, "Pike", { kind: "length", inches }, { alsoMeasure: { kind: "weight", pounds } });
    const catches = [pair("p1", 20, 2), pair("p2", 30, 7), fish("long", "pikes", { kind: "length", inches: 34 }), fish("heavy", "Perch", { kind: "weight", pounds: 3 })];
    expect(largestFirst(catches).map((entry) => entry.id)[0]).toBe("long");
  });
});

describe("round 107: a kind's first fish", () => {
  it("is not a later fish typed in the plural", () => {
    const at = (day: string) => `2026-08-${day}T08:00:00.000Z`;
    // Two plurals after the kind's first: before, the plurals were a kind of their own and "c" its first.
    const catches = [fish("a", "Perch", { kind: "length", inches: 9 }, { caughtAt: at("01") }), fish("b", "Perch", { kind: "length", inches: 9 }, { caughtAt: at("02") }), fish("c", "Perches", { kind: "length", inches: 9 }, { caughtAt: at("03") }), fish("d", "Perches", { kind: "length", inches: 9 }, { caughtAt: at("04") })];
    const book: Logbook = { spots: [], trips: [], catches };
    expect(milestoneOf(book, catches[2]!)).not.toEqual({ of: "kind", n: 1 });
  });
});

describe("round 107: the same fish logged twice", () => {
  it("is caught by its kind however it was typed", () => {
    const book: Logbook = { spots: [], trips: [], catches: [fish("a", "Perch", { kind: "length", inches: 9 })] };
    expect(likelyDuplicate(book, { species: "perches", spotId: "own", caughtAt: "2026-08-20T08:02:00.000Z" })?.id).toBe("a");
  });
});
