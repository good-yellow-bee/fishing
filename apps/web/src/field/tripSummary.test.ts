import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { tripSummary } from "./tripSummary";

const trip = { id: "trip-dawn", date: "2026-10-10", spotId: "spot-cedar", title: "Dawn patrol", note: "Fog until eight." };
const fish = (id: string, at: string, released = false): CatchEntry => ({
  id,
  species: "Largemouth bass",
  measure: { kind: "weight", pounds: 3.2 },
  lure: "Texas-rig worm",
  spotId: "spot-cedar",
  tripId: "trip-dawn",
  caughtAt: at,
  note: "",
  weather: null,
  ...(released ? { released: true } : {}),
});

describe("trip summary", () => {
  it("lists the day, the water and each fish in the order it came, then the note", () => {
    const text = tripSummary(trip, "Cedar Bend", [fish("b", "2026-10-10T14:00:00.000Z", true), fish("a", "2026-10-10T12:00:00.000Z")]);
    const lines = text.split("\n");
    expect(lines[0]).toContain("Dawn patrol · ");
    expect(lines[0]).toContain(" · Cedar Bend");
    expect(lines[1]).toBe("2 fish");
    expect(lines[2]).toMatch(/^- .*Largemouth bass, 3\.2 lb, Texas-rig worm$/);
    expect(lines[3]).toMatch(/, Released$/);
    expect(lines.at(-1)).toBe("Fog until eight.");
  });

  it("leaves out a missing water and an empty note", () => {
    const text = tripSummary({ ...trip, note: " " }, null, []);
    expect(text.split("\n")).toHaveLength(2);
  });
});
