// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Spot } from "@stillwater/shared";
import { WaterOptions } from "./WaterOptions";
import { bestLureAt } from "./waterLure";

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const fish = (id: string, spotId: string, caughtAt: string, lure = "Jig") =>
  ({ id, species: "Zander", lure, spotId, tripId: null, caughtAt, measure: { kind: "length", inches: 20 }, note: "" }) as unknown as CatchEntry;

describe("round 81 ideas: a long water picker starts with the waters fished lately", () => {
  const spots = ["a", "b", "c", "d", "e", "f", "g"].map((id) => water(id, `Lake ${id.toUpperCase()}`));
  const catches = [fish("1", "f", "2026-10-01T08:00:00Z"), fish("2", "b", "2026-10-10T08:00:00Z"), fish("3", "d", "2026-09-01T08:00:00Z"), fish("4", "a", "2026-08-01T08:00:00Z")];
  const book = { spots, trips: [], catches } as Logbook;

  it("groups the three last fished, then the rest by name", () => {
    const html = renderToStaticMarkup(
      <select>
        <WaterOptions book={book} spots={spots} />
      </select>,
    );
    const lately = html.match(/<optgroup label="Fished lately">(.*?)<\/optgroup>/)![1]!;
    expect([...lately.matchAll(/value="(\w)"/g)].map((m) => m[1])).toEqual(["b", "f", "d"]);
    const rest = html.match(/<optgroup label="All waters">(.*?)<\/optgroup>/)![1]!;
    expect([...rest.matchAll(/value="(\w)"/g)].map((m) => m[1])).toEqual(["a", "c", "e", "g"]);
  });

  it("keeps a short list as it was", () => {
    const short = spots.slice(0, 6);
    const html = renderToStaticMarkup(
      <select>
        <WaterOptions book={{ ...book, spots: short }} spots={short} />
      </select>,
    );
    expect(html).not.toContain("optgroup");
  });
});

describe("round 81 ideas: a water's best lure", () => {
  it("names a lure that took two and more than any other", () => {
    expect(bestLureAt([fish("1", "a", "x", "Spoon"), fish("2", "a", "y", "Spoon"), fish("3", "a", "z", "Jig")], "a")).toBe("Spoon");
    expect(bestLureAt([fish("1", "a", "x", "Spoon"), fish("2", "a", "y", "Jig")], "a")).toBeNull();
    expect(bestLureAt([fish("1", "a", "x", "Spoon"), fish("2", "b", "y", "Spoon")], "a")).toBeNull();
  });
});
