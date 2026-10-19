import { describe, expect, it } from "vitest";
import { parseTripDraft, type Logbook, type Trip } from "@stillwater/shared";
import { tripSummary } from "./summaries";

const book = { spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [], catches: [] } as unknown as Logbook;
const draft = (date: string) => ({ date, spotId: "own", title: "", note: "" });

describe("round 82 leftovers: an outing's year is checked", () => {
  it("refuses a year decades off and keeps this one", () => {
    expect(parseTripDraft(draft("2062-10-12"), book)).toMatchObject({ ok: false });
    expect(parseTripDraft(draft("0202-10-12"), book)).toMatchObject({ ok: false });
    expect(parseTripDraft(draft(`${new Date().getFullYear()}-01-12`), book)).toMatchObject({ ok: true });
  });
});

describe("round 82 leftovers: a night session's summary says the day of its small-hours fish", () => {
  it("dates the fish after midnight", () => {
    const trip = { id: "t", date: "2026-10-10", spotId: "own", title: "Night", note: "" } as Trip;
    const fish = (id: string, at: string) => ({ id, tripId: "t", spotId: "own", caughtAt: new Date(at).toISOString(), species: "Zander", lure: "Jig", note: "", weather: null, released: false, measure: { kind: "length", inches: 20 } });
    const text = tripSummary(trip, "Own Lake", [fish("a", "2026-10-10T22:00:00"), fish("b", "2026-10-11T00:30:00")] as never);
    const lines = text.split("\n").filter((line) => line.startsWith("- "));
    expect(lines[0]).not.toMatch(/Oct 11/);
    expect(lines[1]).toMatch(/Oct 11/);
  });
});
