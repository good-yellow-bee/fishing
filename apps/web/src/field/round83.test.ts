import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { samePage } from "./leaveDeleted";
import { findCatches } from "./CatchSearch";
import { catchList } from "./catchList";

const id = (text: string) => text.split("|")[0]!;
const fish = (o: Record<string, unknown>) => ({ tripId: null, weather: null, note: "", lure: "Jig", species: "Zander", released: false, measure: { kind: "length", inches: 20 }, ...o });

describe("round 83: Undo comes forward to a list whose address has a space", () => {
  it("reads %20 and + as the same page", () => {
    expect(samePage("/catches/e1?in=species%3ANorthern%20pike", "/catches/e1?in=species%3ANorthern+pike")).toBe(true);
    expect(samePage("/species/Northern%20pike", "/species/Northern pike")).toBe(true);
    expect(samePage("/catches/e1?in=species%3ANorthern+pike", "/catches/e2?in=species%3ANorthern+pike")).toBe(false);
  });
});

describe("round 83: time and sky words find the fish then, not letters inside words", () => {
  const book = {
    spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "Północny brzeg, płytko przy liliach.", bestConditions: "" }],
    trips: [],
    catches: [
      fish({ id: "noon", spotId: "own", caughtAt: "2026-10-12T12:00:00", species: "Tench", lure: "Nightcrawler" }),
      fish({ id: "late", spotId: "own", caughtAt: "2026-10-12T23:30:00" }),
      fish({ id: "trout", spotId: "own", caughtAt: "2026-10-13T09:00:00", species: "Rainbow trout", weather: { sky: "clear", wind: "calm", airTempF: 60, waterTempF: 55 } }),
    ],
  } as unknown as Logbook;
  const find = (needle: string) => findCatches(book, needle, id, () => false).map((entry) => entry.id);

  it("finds only the night fish for “night” and “noc”", () => {
    expect(find("night")).toEqual(["late"]);
    expect(find("noc")).toEqual(["late"]);
    expect(find("at night")).toEqual(["late"]);
  });

  it("finds no Rainbow trout for “rain”, and still finds a word at the start of a note's word", () => {
    expect(find("rain")).toEqual([]);
    expect(find("lili")).toHaveLength(3);
  });
});

describe("round 83: the whole Catches list shown largest first is a list to step through", () => {
  const book = {
    spots: [],
    trips: [],
    catches: [
      fish({ id: "small", spotId: "own", caughtAt: "2026-10-12T12:00:00", measure: { kind: "length", inches: 10 } }),
      fish({ id: "big", spotId: "own", caughtAt: "2026-10-11T12:00:00", measure: { kind: "length", inches: 30 } }),
      fish({ id: "mid", spotId: "own", caughtAt: "2026-10-10T12:00:00", measure: { kind: "length", inches: 20 } }),
    ],
  } as unknown as Logbook;

  it("steps largest first and goes back to the list in that order", () => {
    const list = catchList(book, "book-largest:all", "mid", id, () => false);
    expect(list?.rows.map((entry) => entry.id)).toEqual(["big", "mid", "small"]);
    expect(list?.back).toBe("/catches?order=largest");
  });
});
