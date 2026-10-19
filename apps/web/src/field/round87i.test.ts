import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { fileSlug, gpxFor } from "./gpx";
import { seasonWaters } from "./seasonWaters";

const water = (id: string, name: string, place?: { lat: number; lng: number }, notes = ""): Spot => ({ id, name, waterType: "lake", notes, bestConditions: "", ...(place ? { place } : {}) }) as Spot;
const trip = (id: string, date: string, spotId: string): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;
const fish = (id: string, spotId: string, caughtAt: string, tripId: string | null = null): CatchEntry =>
  ({ id, species: "Pike", measure: { kind: "length", inches: 20 }, lure: "Jig", spotId, tripId, caughtAt, note: "", weather: null }) as CatchEntry;

describe("round 87 ideas: a water's place for a GPS", () => {
  it("writes a waypoint per water with a place, its name and notes escaped", () => {
    const gpx = gpxFor([water("a", "Pike & <Perch> Pond", { lat: 53.8, lng: 21.5 }, "Weed bed by the \"old\" jetty"), water("b", "No pin")]);
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain('<wpt lat="53.8" lon="21.5">');
    expect(gpx).toContain("<name>Pike &amp; &lt;Perch&gt; Pond</name>");
    expect(gpx).toContain("<desc>Weed bed by the &quot;old&quot; jetty</desc>");
    expect(gpx.match(/<wpt/g)).toHaveLength(1);
  });

  it("names the file after the water, Polish letters folded", () => {
    expect(fileSlug("Jezioro Łańskie")).toBe("stillwater-jezioro-lanskie");
    expect(fileSlug("???")).toBe("stillwater-water");
  });
});

describe("round 87 ideas: this season's waters", () => {
  it("counts waters fished this year and those first fished this year, not plans or the game's lake", () => {
    const book: Logbook = {
      spots: [water("old", "Old Pit"), water("new", "New Lake"), water("plan", "Plan Lake"), water("spot-stillwater", "Stillwater")],
      trips: [trip("t1", "2025-06-01", "old"), trip("t2", "2026-05-01", "old"), trip("t3", "2026-09-01", "new"), trip("t4", "2026-10-25", "plan"), trip("g", "2026-10-01", "spot-stillwater")],
      catches: [fish("f1", "old", new Date(2025, 5, 1, 9).toISOString(), "t1"), fish("f2", "new", new Date(2026, 8, 1, 9).toISOString(), "t3")],
    };
    expect(seasonWaters(book, "2026-10-19")).toEqual({ fished: 2, first: 1 });
  });
});

describe("round 87 ideas: a water's last temperature on its card", () => {
  it("is the newest reading there, while it is a month old or less", async () => {
    const { recentTemp } = await import("./SpotPages");
    const read = (id: string, at: Date, waterTempF: number, spotId = "own") => ({ ...fish(id, spotId, at.toISOString()), weather: { waterTempF } }) as CatchEntry;
    const catches = [read("a", new Date(2026, 9, 1, 8), 55), read("b", new Date(2026, 9, 12, 8), 51), read("c", new Date(2026, 9, 15, 8), 70, "other")];
    expect(recentTemp(catches, "own", "2026-10-19")).toEqual({ fahrenheit: 51, day: "2026-10-12" });
    expect(recentTemp(catches, "own", "2026-11-20")).toBeNull();
    expect(recentTemp([], "own", "2026-10-19")).toBeNull();
  });
});
