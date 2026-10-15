import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { catchesOfSpecies, speciesLink, speciesWaters } from "./speciesLink";

describe("species page", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));

  it("links by the book's name, safely encoded", () => {
    expect(speciesLink("Northern pike")).toBe("/species/Northern%20pike");
    expect(speciesLink("Pike/Jack")).toBe("/species/Pike%2FJack");
  });

  it("finds that kind's fish whatever the case, newest first", () => {
    const pike = catchesOfSpecies(book, "northern PIKE");
    expect(pike.length).toBeGreaterThan(0);
    expect(pike.every((entry) => entry.species === "Northern pike")).toBe(true);
    expect(pike.map((entry) => entry.caughtAt)).toEqual([...pike.map((entry) => entry.caughtAt)].sort().reverse());
    expect(catchesOfSpecies(book, "Coelacanth")).toEqual([]);
  });

  it("lists the waters it came from, most fish first", () => {
    const trout = catchesOfSpecies(book, "Brook trout");
    const waters = speciesWaters(book, trout);
    expect(waters.reduce((sum, row) => sum + row.count, 0)).toBe(trout.length);
    expect(waters[0]!.name).not.toBeNull();
    for (let i = 1; i < waters.length; i += 1) expect(waters[i - 1]!.count).toBeGreaterThanOrEqual(waters[i]!.count);
  });
});
