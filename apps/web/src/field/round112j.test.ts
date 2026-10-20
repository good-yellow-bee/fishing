import { describe, expect, it } from "vitest";
import type { Logbook, Trip } from "@stillwater/shared";
import { findTrips } from "./tripSearch";

const trip = (id: string, title: string, note: string): Trip => ({ id, date: "2026-10-12", spotId: "a", title, note });

describe("round 112 ideas: outings by a note or by no title", () => {
  const book: Logbook = { spots: [{ id: "a", name: "Pine Pond", waterType: "pond", notes: "", bestConditions: "" }], trips: [trip("n", "Dawn", "Calm at first light."), trip("u", "", ""), trip("b", " ", " ")], catches: [] };
  const ids = (needle: string) => findTrips(book, needle, () => 1, "2026-10-20", (text) => text).map((found) => found.id).sort();
  it("finds those with a write-up", () => {
    expect(ids("with a note")).toEqual(["n"]);
    expect(ids("z notatką")).toEqual(["n"]);
  });
  it("finds those never given a title", () => {
    expect(ids("untitled")).toEqual(["b", "u"]);
    expect(ids("bez tytułu")).toEqual(["b", "u"]);
  });
});
