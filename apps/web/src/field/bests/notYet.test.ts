import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { notYetThisYear } from "./notYet";

describe("notYetThisYear", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, year: number, species: string): CatchEntry => ({ ...base, id, species, caughtAt: new Date(year, 5, 1).toISOString() });

  it("lists last year's kinds still missing this year", () => {
    const catches = [fish("a", 2025, "Walleye"), fish("b", 2025, "Northern pike"), fish("c", 2026, "northern pike"), fish("d", 2024, "Bluegill")];
    expect(notYetThisYear(catches, new Date(2026, 9, 17))).toEqual(["Walleye"]);
    expect(notYetThisYear([], new Date(2026, 9, 17))).toEqual([]);
  });
});
