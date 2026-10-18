// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { FishSum } from "./FishSum";
import { tempThroughYear } from "./waterTips";
import { mergedInto } from "./waterMerge";

const fish = (id: string, caughtAt: string, waterTempF?: number) =>
  ({ id, species: "Zander", lure: "Jig", spotId: "home", tripId: null, caughtAt: new Date(caughtAt).toISOString(), measure: { kind: "length", inches: 20 }, note: "", ...(waterTempF ? { weather: { waterTempF } } : {}) }) as unknown as CatchEntry;

describe("round 81: a water's temperature through the year goes by the day a fish counts on", () => {
  // A New Year's Eve night: the 00:40 fish counts on Dec 31.
  const catches = [fish("a", "2025-12-31T22:10:00", 38), fish("b", "2026-01-01T00:40:00", 37), fish("c", "2025-06-02T09:00:00", 60), fish("d", "2026-05-02T09:00:00", 55)];
  const dayOf = (entry: CatchEntry) => (entry.id === "b" ? "2025-12-31" : new Date(entry.caughtAt).toISOString().slice(0, 10));

  it("puts the small hours' reading in the old year", () => {
    const readings = tempThroughYear(catches, dayOf);
    expect(readings.map((reading) => reading.day)).toEqual(["2025-06-02", "2025-12-31"]);
    expect(readings[1]!.fahrenheit).toBe(37);
  });
});

describe("round 81: a water merged twice", () => {
  it("is followed to the water still in the book, and an undone merge names none", () => {
    const merged = { west: "own", own: "pine" };
    expect(mergedInto(merged, "west", (id) => id === "pine")).toBe("pine");
    expect(mergedInto(merged, "own", (id) => id === "pine")).toBe("pine");
    expect(mergedInto({}, "east", () => true)).toBeNull();
    expect(mergedInto({ a: "b", b: "a" }, "a", () => false)).toBeNull();
  });
});

describe("round 81: the largest opens within the page's list", () => {
  it("links with the list when one is given", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FishSum catches={[fish("a", "2026-05-02T09:00:00")]} list="water:home" />
      </MemoryRouter>,
    );
    expect(html).toContain('href="/catches/a?in=water%3Ahome"');
  });
});

describe("round 81: a long name wraps in a form's hint", () => {
  it("breaks anywhere", () => {
    expect(readFileSync(`${import.meta.dirname}/field.css`, "utf8")).toMatch(/\.field-hint \{[^}]*overflow-wrap: anywhere;/);
  });
});
