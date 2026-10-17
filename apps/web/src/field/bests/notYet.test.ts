import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { newWatersThisYear, notYetThisYear } from "./notYet";

describe("notYetThisYear", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, year: number, species: string): CatchEntry => ({ ...base, id, species, caughtAt: new Date(year, 5, 1).toISOString() });

  it("lists last year's kinds still missing this year", () => {
    const catches = [fish("a", 2025, "Walleye"), fish("b", 2025, "Northern pike"), fish("c", 2026, "northern pike"), fish("d", 2024, "Bluegill")];
    expect(notYetThisYear(catches, new Date(2026, 9, 17))).toEqual(["Walleye"]);
    expect(notYetThisYear([], new Date(2026, 9, 17))).toEqual([]);
  });

  it("groups by something else when asked, such as the lure", () => {
    const catches = [{ ...fish("a", 2025, "Walleye"), lure: "Jig" }, { ...fish("b", 2025, "Walleye"), lure: "Spoon" }, { ...fish("c", 2026, "Pike"), lure: "jig" }, { ...fish("d", 2025, "Pike"), lure: " " }];
    expect(notYetThisYear(catches, new Date(2026, 9, 17), (entry) => entry.lure)).toEqual(["Spoon"]);
  });
});

describe("newWatersThisYear", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, year: number, month: number, spotId: string): CatchEntry => ({ ...base, id, spotId, caughtAt: new Date(year, month, 1).toISOString() });
  const today = new Date(2026, 9, 17);

  it("lists the waters whose first fish came this year, oldest first", () => {
    const catches = [fish("a", 2025, 5, "old"), fish("b", 2026, 7, "late"), fish("c", 2026, 4, "early"), fish("d", 2026, 5, "old"), fish("e", 2026, 3, "spot-stillwater")];
    expect(newWatersThisYear(catches, today)).toEqual(["early", "late"]);
  });

  it("says nothing in a book begun this year", () => {
    expect(newWatersThisYear([fish("a", 2026, 4, "x"), fish("b", 2026, 5, "y")], today)).toEqual([]);
  });
});
