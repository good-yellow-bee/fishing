import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { lureByTemp } from "./waterTips";

describe("lureByTemp", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, lure: string, waterTempF: number): CatchEntry => ({ ...base, id, lure, weather: { sky: "clear", wind: "calm", waterTempF } });

  it("names the leading lure in each band once two bands have one", () => {
    const catches = [fish("a", "Jig", 45), fish("b", "Jig", 48), fish("c", "Spoon", 55), fish("d", "Spoon", 58), fish("e", "Jig", 57)];
    expect(lureByTemp(catches).map((row) => [row.band.from, row.lure])).toEqual([[null, "Jig"], [50, "Spoon"]]);
  });

  it("says nothing with one band, or a tie", () => {
    expect(lureByTemp([fish("a", "Jig", 45), fish("b", "Jig", 48)])).toEqual([]);
    expect(lureByTemp([fish("a", "Jig", 45), fish("b", "Jig", 48), fish("c", "Spoon", 55), fish("d", "Jig", 58)])).toEqual([]);
  });
});
