import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { intoOuting } from "./CatchPages";
import { findCatches } from "./CatchSearch";

afterEach(() => setLang("en"));

const ownLake = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];
const fish = (id: string, caughtAt: string, note = "", tripId: string | null = "dawn"): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "own-lake",
  tripId,
  caughtAt,
  note,
  weather: null,
});
const book: Logbook = {
  spots: [ownLake],
  trips: [{ id: "dawn", date: "2026-10-10", spotId: "own-lake", title: "Dawn", note: "" }],
  catches: [fish("a", "2026-10-10T05:00:00.000Z", "Off the weed edge"), fish("b", "2026-10-10T07:10:00.000Z"), fish("c", "2026-10-10T06:00:00.000Z", "", null)],
};

describe("round 89 ideas: how far into its outing a fish came", () => {
  it("counts from the outing's first fish", () => {
    expect(intoOuting(book, book.catches[1]!)).toBe("2 h 10 min after the outing's first fish");
    setLang("pl");
    expect(intoOuting(book, book.catches[1]!)).toBe("2 godz. 10 min po pierwszej rybie wyprawy");
  });

  it("says nothing for the first fish, or one off any outing", () => {
    expect(intoOuting(book, book.catches[0]!)).toBeNull();
    expect(intoOuting(book, book.catches[2]!)).toBeNull();
  });
});

describe("round 89 ideas: “note” finds the fish written up", () => {
  it("in either language, and “-note” the ones left bare", () => {
    expect(findCatches(book, "note", t).map((entry) => entry.id)).toEqual(["a"]);
    expect(findCatches(book, "-note", t).map((entry) => entry.id).sort()).toEqual(["b", "c"]);
    setLang("pl");
    expect(findCatches(book, "notatka", t).map((entry) => entry.id)).toEqual(["a"]);
  });
});
