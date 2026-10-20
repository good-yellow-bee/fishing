import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { tripsCsv } from "./catchCsv";
import { outNow, underWay } from "./tripDates";

const fish = (id: string, released: boolean): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: "2026-10-10T08:00:00.000Z", note: "", weather: null, released });

describe("round 108 ideas: the outings sheet", () => {
  it("counts the fish that went back beside the fish", () => {
    const book: Logbook = { spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [{ id: "t", date: "2026-10-10", spotId: "own", title: "Dawn", note: "" }], catches: [fish("a", true), fish("b", true), fish("c", false)] };
    const [head, row] = tripsCsv(book, "2026-10-19").replace(/^\uFEFF/, "").split("\r\n");
    expect(head!.split(",")).toEqual(["Date", "Trip", "Water", "Fish", "Kinds", "Lures", "Lost fish", "Missed strikes", "Released fish", "Fish times", "Note"]);
    expect(row!.split(",")[3]).toBe("3");
    expect(row!.split(",")[8]).toBe("2");
  });
});

describe("round 108 ideas: today's outing under way", () => {
  const plan = { id: "eve", date: "2026-10-20", spotId: "own", title: "Evening", note: "" };
  const loose: CatchEntry = { ...fish("l", false), tripId: null, caughtAt: new Date(2026, 9, 20, 18, 0).toISOString() };

  it("is so with a fish logged loose on its water that day, and out now with one these twelve hours", () => {
    const book: Logbook = { spots: [], trips: [plan], catches: [loose] };
    expect(underWay(book, plan)).toBe(true);
    expect(outNow(book, plan, new Date(2026, 9, 20, 19, 0))).toBe(true);
    expect(underWay({ ...book, catches: [] }, plan)).toBe(false);
    expect(underWay({ ...book, catches: [] }, { ...plan, lost: 1 })).toBe(true);
  });
});
