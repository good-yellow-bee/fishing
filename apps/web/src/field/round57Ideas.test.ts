import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { outingMean } from "./outingAverage";
import { notesHere } from "./outingNotes";
import { recordHere } from "./RecordHere";

const trip = (id: string, date: string, note = "") => ({ id, spotId: "w", date, title: "", note });
const fish = (id: string, inches: number): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: { kind: "length", inches },
  lure: "Jig",
  spotId: "w",
  tripId: null,
  caughtAt: "2026-10-10T10:00:00.000Z",
  note: "",
  weather: null,
});

describe("round 57 ideas", () => {
  it("averages the other outings fished here, once there are two", () => {
    const counts: Record<string, number> = { a: 1, b: 4, c: 5, d: 0 };
    const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("c", "2026-10-10"), trip("d", "2026-10-20")];
    expect(outingMean(trips, (id) => counts[id]!, "2026-10-15", "c")).toBe(2.5);
    expect(outingMean(trips.slice(1), (id) => counts[id]!, "2026-10-15", "c")).toBeNull();
  });

  it("gives the latest notes from days fished, first line, cut when long", () => {
    const long = "x".repeat(140);
    const rows = notesHere([trip("a", "2026-10-01", "Weed edge\nmore"), trip("b", "2026-10-05", long), trip("c", "2026-10-20", "plan"), trip("d", "2026-10-03", "")], "2026-10-15");
    expect(rows.map((row) => row.trip.id)).toEqual(["b", "a"]);
    expect(rows[0]!.text).toHaveLength(100);
    expect(rows[1]!.text).toBe("Weed edge…");
  });

  it("sets the day's largest against the water's record", () => {
    const day = [fish("a", 20), fish("b", 28)];
    expect(recordHere(day, [...day, fish("c", 34)])).toMatchObject({ largest: { id: "b" }, record: { id: "c" }, kind: "length" });
    expect(recordHere(day, [...day, fish("c", 10)])!.record.id).toBe("b");
    expect(recordHere(day, day)).toBeNull();
  });
});
