import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { tripsCsv } from "./catchCsv";

const fish = (id: string, released: boolean): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: "2026-10-10T08:00:00.000Z", note: "", weather: null, released });

describe("round 108 ideas: the outings sheet", () => {
  it("counts the fish that went back beside the fish", () => {
    const book: Logbook = { spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [{ id: "t", date: "2026-10-10", spotId: "own", title: "Dawn", note: "" }], catches: [fish("a", true), fish("b", true), fish("c", false)] };
    const [head, row] = tripsCsv(book, "2026-10-19").replace(/^\uFEFF/, "").split("\r\n");
    expect(head!.split(",").slice(3, 5)).toEqual(["Fish", "Released fish"]);
    expect(row!.split(",").slice(3, 5)).toEqual(["3", "2"]);
  });
});
