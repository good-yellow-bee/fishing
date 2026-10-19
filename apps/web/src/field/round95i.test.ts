import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { csvName } from "./FishCsv";

const fish = (id: string, over: Partial<CatchEntry> = {}): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own",
  tripId: null,
  caughtAt: "2026-10-10T08:00",
  note: "",
  weather: null,
  ...over,
});

afterEach(() => setLang("en"));

describe("round 95 ideas: quick searches", () => {
  const book: Logbook = { spots: [], trips: [], catches: [fish("a", { released: true }), fish("b", { caughtAt: "2026-10-10T23:00" })] };

  it("are words the search reads, in either language", () => {
    expect(findCatches(book, t("released|search word"), t).map((entry) => entry.id)).toEqual(["a"]);
    setLang("pl");
    expect(t("released|search word")).toBe("wypuszczone");
    expect(findCatches(book, t("released|search word"), t).map((entry) => entry.id)).toEqual(["a"]);
    expect(findCatches(book, t("record|search word"), t).length).toBeGreaterThan(0);
  });
});

describe("round 95 ideas: a search's spreadsheet is named after it", () => {
  it("as a water's or a kind's is", () => {
    expect(csvName('lure:"Pheasant tail" + water:"Mill Race"')).toBe("stillwater-lure-pheasant-tail-water-mill-race.csv");
    expect(csvName("szczupak")).toBe("stillwater-szczupak.csv");
  });
});
