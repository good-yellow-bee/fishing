import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { setLang } from "../i18n";
import { tripsCsv } from "./catchCsv";
import { planText } from "./TripPages";

const fish = (id: string, lure: string): CatchEntry => ({
  id,
  species: "Zander",
  measure: { kind: "length", inches: 20 },
  lure,
  spotId: "own",
  tripId: "t",
  caughtAt: "2026-10-10T08:00:00.000Z",
  note: "",
  weather: null,
});

const book: Logbook = {
  spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }],
  trips: [{ id: "t", date: "2026-10-10", spotId: "own", title: "Dawn", note: "" }],
  catches: [fish("a", "Spinner"), fish("b", "spinner "), fish("c", "Jig"), fish("d", "")],
};

afterEach(() => setLang("en"));

describe("round 102 ideas: the outings sheet names the lures", () => {
  it("most first, a piece however it was typed, beside the kinds", () => {
    const [head, row] = tripsCsv(book, "2026-10-19").replace(/^\uFEFF/, "").split("\r\n");
    expect(head).toBe("Date,Trip,Water,Fish,Kinds,Lures,Lost fish,Missed strikes,Note");
    expect(row).toBe('2026-10-10,Dawn,Own Lake,4,Zander ×4,"Spinner ×2, Jig",0,0,');
  });

  it("in Polish too", () => {
    setLang("pl");
    expect(tripsCsv(book, "2026-10-19").split("\r\n")[0]).toContain(";Przynęty;");
  });
});

describe("round 102 ideas: the plan as text", () => {
  it("starts with the outing, its day and its water", () => {
    expect(planText(book, book.trips[0]!, []).split("\n")[0]).toMatch(/^Dawn · .+ · Own Lake$/);
    expect(planText(book, { ...book.trips[0]!, title: "Own Lake" }, []).split("\n")[0]).toMatch(/^[^·]+ · Own Lake$/);
  });
});
