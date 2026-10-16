import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { catchSummary, spotSummary, tripSummary } from "./tripSummary";

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

  it("names the water of a fish from somewhere else, and gives the year", () => {
    const away = { ...fish("c", "2026-10-10T13:00:00.000Z"), spotId: "spot-quarry" };
    const text = tripSummary(trip, "Cedar Bend", [away, fish("a", "2026-10-10T12:00:00.000Z")], (id) => (id === "spot-quarry" ? "Quarry Pond" : null));
    const lines = text.split("\n");
    expect(lines[0]).toContain("2026");
    expect(lines[2]).not.toContain("Quarry Pond");
    expect(lines[3]).toMatch(/Texas-rig worm, Quarry Pond$/);
  });

  it("leaves out a missing water and an empty note", () => {
    const text = tripSummary({ ...trip, note: " " }, null, []);
    expect(text.split("\n")).toHaveLength(2);
  });

  it("sums up one fish with its day, water and note", () => {
    const lines = catchSummary({ ...fish("a", "2026-10-10T12:00:00.000Z", true), note: "Off the weed edge." }, "Cedar Bend").split("\n");
    expect(lines[0]).toBe("Largemouth bass, 3.2 lb, Texas-rig worm, Released");
    expect(lines[1]).toMatch(/ · Cedar Bend$/);
    expect(lines.at(-1)).toBe("Off the weed edge.");
  });
});

describe("spot summary", () => {
  const spot = { id: "spot-cedar", name: "Cedar Bend", waterType: "lake" as const, notes: "Weed edge on the north side.", bestConditions: "Overcast" };

  it("gives the water, its outings and fish, the best outing, the top lures, and its notes", () => {
    const catches = [fish("a", "2026-10-10T12:00:00.000Z"), fish("b", "2026-10-10T14:00:00.000Z"), { ...fish("c", "2026-10-11T14:00:00.000Z"), lure: "Spinnerbait" }];
    const lines = spotSummary(spot, 3, catches, "1 fish an outing on average", { trip, fish: 2 }).split("\n");
    expect(lines[0]).toBe("Cedar Bend · Lake");
    expect(lines[1]).toBe("3 outings · 3 fish");
    expect(lines[2]).toBe("1 fish an outing on average");
    expect(lines[3]).toMatch(/^Best outing here: Dawn patrol · .*2026, 2 fish$/);
    expect(lines[4]).toBe("Lures that took the most: Texas-rig worm (2), Spinnerbait (1)");
    expect(lines[5]).toBe("Best conditions: Overcast");
    expect(lines.slice(6)).toEqual(["", "Weed edge on the north side."]);
  });

  it("leaves out the lines it has nothing for", () => {
    const text = spotSummary({ ...spot, notes: "", bestConditions: " " }, 1, [fish("a", "2026-10-10T12:00:00.000Z")], null, null);
    expect(text).toBe("Cedar Bend · Lake\n1 outing · 1 fish\nLures that took the most: Texas-rig worm (1)");
  });
});
