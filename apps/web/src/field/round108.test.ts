import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { setLang } from "../i18n";
import { outingName } from "./format";
import { kindNames } from "./speciesLink";
import { tripLists } from "./TripPages";

const fish = (id: string, species: string, tripId: string | null = null, caughtAt = "2026-08-20T08:00:00.000Z"): CatchEntry => ({ id, species, measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "own", tripId, caughtAt, note: "", weather: null });

afterEach(() => setLang("en"));

describe("round 108: a kind's name in English", () => {
  it("is the book's most-written spelling, not the dictionary's", () => {
    expect(kindNames([fish("a", "Roaches"), fish("b", "Roaches"), fish("c", "Roach")])("Roach")).toBe("Roaches");
    setLang("pl");
    expect(kindNames([fish("a", "zander")])("zander")).toBe("Sandacz");
  });
});

describe("round 108: an untitled outing", () => {
  it("reads as its water is named, however its saved name was typed", () => {
    expect(outingName({ title: "home lake ", spotId: "own" }, [{ id: "own", name: "Home Lake" }])).toBe("Home Lake");
    expect(outingName({ title: "Dawn", spotId: "own" }, [{ id: "own", name: "Home Lake" }])).toBe("Dawn");
  });
});

describe("round 108: Trips' Recent", () => {
  it("puts a day's dusk before its dawn, whatever order they were saved in", () => {
    const day = { date: "2026-10-10", spotId: "own", title: "", note: "" };
    const book: Logbook = { spots: [], trips: [{ ...day, id: "dawn" }, { ...day, id: "dusk" }], catches: [fish("d", "Perch", "dawn", "2026-10-10T05:00:00.000Z"), fish("k", "Perch", "dusk", "2026-10-10T18:00:00.000Z")] };
    expect(tripLists(book, new Date(2026, 9, 19, 12)).recent.map((trip) => trip.id)).toEqual(["dusk", "dawn"]);
  });
});
