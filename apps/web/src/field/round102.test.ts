import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { setLang } from "../i18n";
import { catchesCsv } from "./catchCsv";
import { catchSummary, searchSummary, tripSummary } from "./summaries";

const fish = (id: string, over: Partial<CatchEntry> = {}): CatchEntry => ({
  id,
  species: "Perch",
  measure: { kind: "length", inches: 9 },
  lure: "Spinner",
  spotId: "own",
  tripId: "t",
  caughtAt: "2026-09-12T19:30:00.000Z",
  note: "",
  weather: null,
  ...over,
});

const trip = { id: "t", date: "2026-09-12", spotId: "own", title: "Late evening", note: "" };
const book: Logbook = {
  spots: [{ id: "own", name: "Home Lake", waterType: "lake", notes: "", bestConditions: "" }],
  trips: [trip],
  catches: [fish("a"), fish("b", { caughtAt: "2026-09-12T20:30:00.000Z" }), fish("c", { species: "perch ", lure: "spinner ", caughtAt: "2026-09-12T21:50:00.000Z" })],
};

afterEach(() => setLang("en"));

describe("round 102: a lure or kind typed two ways", () => {
  it("goes in the catches sheet under the book's most-used spelling", () => {
    const csv = catchesCsv(book);
    expect(csv).not.toMatch(/,spinner,/);
    expect(csv.match(/,Spinner,/g)).toHaveLength(3);
  });

  it("reads once in a copied outing and a copied search", () => {
    const outing = tripSummary(trip, "Home Lake", book.catches);
    expect(outing).not.toMatch(/perch|spinner/);
    const search = searchSummary(["perch"], book.catches, () => "Home Lake");
    expect(search.split("\n").slice(2).join("\n")).not.toMatch(/perch|spinner/);
  });

  it("reads in Polish however it was typed", () => {
    setLang("pl");
    expect(tripSummary(trip, "Home Lake", book.catches)).not.toMatch(/Perch|perch|Spinner|spinner/);
  });
});

describe("round 102: a copied fish on an untitled outing", () => {
  it("leaves the outing out when the caller names none", () => {
    expect(catchSummary(book.catches[0]!, "Home Lake")).not.toContain("Outing:");
  });
});
