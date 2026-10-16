import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { catchSummary, searchSummary, speciesSummary, spotSummary, tripSummary, yearSummary } from "./summaries";

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

describe("species summary", () => {
  it("counts the kind, names its sizes, days, waters and lures", () => {
    const catches = [
      { ...fish("b", "2026-10-11T14:00:00.000Z", true), measure: { kind: "length" as const, inches: 18 } },
      fish("a", "2026-09-10T12:00:00.000Z"),
    ];
    const lines = speciesSummary("Largemouth bass", catches, [{ name: "Cedar Bend", count: 2 }, { name: null, count: 1 }]).split("\n");
    expect(lines[0]).toBe("Largemouth bass");
    expect(lines[1]).toBe("2 fish · 1 released");
    expect(lines[2]).toBe("Longest: 18 in · Heaviest: 3.2 lb");
    expect(lines[3]).toMatch(/^First in the book .*2026 · newest .*2026$/);
    expect(lines[4]).toBe("Waters: Cedar Bend (2)");
    expect(lines[5]).toBe("Lures that took the most: Texas-rig worm (2)");
  });

  it("leaves out the day span for a single fish", () => {
    expect(speciesSummary("Largemouth bass", [fish("a", "2026-09-10T12:00:00.000Z")], [])).toBe("Largemouth bass\n1 fish\nHeaviest: 3.2 lb\nLures that took the most: Texas-rig worm (1)");
  });
});

describe("year summary", () => {
  it("counts the year's fish, days and goal, and names its sizes, waters and lures", () => {
    const book = {
      spots: [{ id: "spot-cedar", name: "Cedar Bend", waterType: "lake" as const, notes: "", bestConditions: "" }],
      trips: [trip],
      catches: [
        fish("a", "2026-10-10T12:00:00.000Z"),
        { ...fish("b", "2026-06-10T12:00:00.000Z"), species: "Bluegill", measure: { kind: "length" as const, inches: 8 } },
        fish("old", "2025-06-10T12:00:00.000Z"),
      ],
    };
    expect(yearSummary(book, "2026", "2026-10-15", 40).split("\n")).toEqual([
      "2026 in the book",
      "2 fish · 2 species",
      "Days on the water in 2026: 2",
      "2 of 40 fish in 2026",
      "Longest: Bluegill, 8 in",
      "Heaviest: Largemouth bass, 3.2 lb",
      "Waters: Cedar Bend (2)",
      "Lures that took the most: Texas-rig worm (2)",
    ]);
  });
});

describe("search summary", () => {
  it("names the search and lists its fish oldest first with their water", () => {
    const lines = searchSummary(["bass"], [fish("b", "2026-10-11T14:00:00.000Z", true), fish("a", "2026-09-10T12:00:00.000Z")], () => "Cedar Bend").split("\n");
    expect(lines[0]).toBe("“bass”");
    expect(lines[1]).toBe("2 fish");
    expect(lines[2]).toMatch(/^- .*Sep 10, 2026 Largemouth bass, 3.2 lb, Texas-rig worm, Cedar Bend$/);
    expect(lines[3]).toMatch(/^- .*Oct 11, 2026 Largemouth bass, 3.2 lb, Texas-rig worm, Cedar Bend, Released$/);
  });

  it("names a linked search by its terms, without the field names", () => {
    expect(searchSummary(['species:"Largemouth bass"', 'water:"Cedar Bend"'], [], () => null).split("\n")[0]).toBe("Largemouth bass + Cedar Bend");
    expect(searchSummary(['species:"Largemouth bass"', "dawn"], [], () => null).split("\n")[0]).toBe("Largemouth bass + “dawn”");
  });
});
