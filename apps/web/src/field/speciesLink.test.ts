import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { catchesOfSpecies, kindOnPage, pageCounts, speciesCounts, speciesLink, speciesWaters } from "./speciesLink";

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

  it("counts the kinds among some fish, most first, whatever the case", () => {
    const base = book.catches[0]!;
    const fish = (id: string, species: string) => ({ ...base, id, species });
    expect(speciesCounts([fish("a", "Perch"), fish("b", "Pike"), fish("c", "perch"), fish("d", "Bass")])).toEqual([
      { species: "Perch", count: 2 },
      { species: "Bass", count: 1 },
      { species: "Pike", count: 1 },
    ]);
  });

  it("leaves the sample week's fish off a kind's page once the angler has fish of their own", () => {
    const pike = catchesOfSpecies(book, "Northern pike");
    expect(kindOnPage(book, "Northern pike")).toHaveLength(pike.length);
    const own = { ...pike[0]!, id: "own-pike" };
    const withOwn = { ...book, catches: [...book.catches, own] };
    expect(kindOnPage(withOwn, "Northern pike").map((entry) => entry.id)).toEqual(["own-pike"]);
    // A kind only the sample caught still shows its sample fish rather than an empty page.
    const trout = catchesOfSpecies(book, "Brook trout");
    expect(kindOnPage(withOwn, "Brook trout")).toHaveLength(trout.length);
    // A kind's chip counts what its page lists.
    const counts = new Map(pageCounts(withOwn.catches).map((row) => [row.species, row.count]));
    expect(counts.get("Northern pike")).toBe(1);
    expect(counts.get("Brook trout")).toBe(trout.length);
  });
});
