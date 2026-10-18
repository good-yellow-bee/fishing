import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { dayMarks } from "./bests/dayMarks";
import { typicalByYear } from "./sizeBands";
import { bookFishDay } from "./tripMonths";

const css = readFileSync(`${import.meta.dirname}/field.css`, "utf8");

const fish = (id: string, caughtAt: string, inches = 24, tripId = "nye") =>
  ({ id, caughtAt, tripId, spotId: "own", species: "Zander", measure: { kind: "length", value: inches, unit: "in" }, released: false, note: "" }) as unknown as CatchEntry;

const bookOf = (catches: CatchEntry[]) =>
  ({
    spots: [{ id: "own", name: "Own", waterType: "lake", notes: "", bestConditions: "" }],
    trips: [{ id: "nye", date: "2025-12-31", spotId: "own", title: "", note: "" }],
    catches,
  }) as unknown as Logbook;

describe("round 74: a calendar day opens its outing only when the outing holds just that day's fish", () => {
  it("keeps the day's search when the outing also had a fish after its night ended", () => {
    const book = bookOf([fish("a", "2025-12-31T23:10:00"), fish("b", "2026-01-01T00:40:00"), fish("c", "2026-01-01T05:30:00")]);
    expect(dayMarks(book, "2025").get("2025-12-31")).toEqual({ fish: 2, trips: ["nye"], lateTrip: null });
  });

  it("opens the outing when all its fish fall on the day", () => {
    const book = bookOf([fish("a", "2025-12-31T23:10:00"), fish("b", "2026-01-01T00:40:00")]);
    expect(dayMarks(book, "2025").get("2025-12-31")!.lateTrip).toBe("nye");
  });
});

describe("round 74: a fish landed past midnight on New Year's night counts in its outing's year", () => {
  it("files the small-hours fish under the old year", () => {
    const catches = [
      fish("a", "2025-06-01T10:00:00", 20, ""),
      fish("b", "2025-07-01T10:00:00", 20, ""),
      fish("c", "2025-08-01T10:00:00", 20, ""),
      fish("d", "2026-01-01T00:40:00", 20),
    ];
    const book = bookOf(catches);
    expect(typicalByYear(catches, "length").map((row) => row.year)).toEqual([]);
    expect(typicalByYear(catches, "length", (entry) => bookFishDay(book, entry)).map((row) => row.year)).toEqual(["2025"]);
  });
});

describe("round 74: Released sits under the tiles without running into a wrapped line above it", () => {
  it("pulls up only right after the tile row", () => {
    expect(css).toMatch(/\.released-share \{\n {2}margin: 0 0 18px;/);
    expect(css).toMatch(/\.stat-row \+ \.released-share \{\n {2}margin-top: -8px;/);
  });
});
