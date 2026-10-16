import { describe, expect, it } from "vitest";
import { fishCountsByTrip, sampleLogbook, type Trip } from "@stillwater/shared";
import { findTrips } from "./tripSearch";

describe("find an outing", () => {
  const now = new Date(2026, 9, 16, 12);
  const base = sampleLogbook(now);
  const spotId = base.spots[0]!.id;
  const water = base.spots[0]!.name;
  const trip = (id: string, date: string, title: string, note = ""): Trip => ({ id, date, spotId, title, note });
  const book = {
    ...base,
    catches: base.catches.map((entry) => ({ ...entry, tripId: null as string | null })),
    trips: [trip("a", "2026-10-12", "Dawn patrol", "Fog on the weed edge"), trip("b", "2026-09-03", "Evening run"), trip("c", "2026-10-20", "Next weekend")],
  };
  book.catches[0] = { ...book.catches[0]!, tripId: "a" };
  const fish = fishCountsByTrip(book);
  const find = (needle: string) => findTrips(book, needle, (id) => fish.get(id) ?? 0, "2026-10-16", (text) => text, now).map((row) => row.id);

  it("finds by title, note and water, every word of a part, newest first", () => {
    expect(find("dawn")).toEqual(["a"]);
    expect(find("weed fog")).toEqual(["a"]);
    expect(find(water.toLowerCase())).toEqual(["c", "a", "b"]);
    expect(find("dawn evening")).toEqual([]);
    expect(find("")).toEqual([]);
  });

  it("finds by the day written out, in either language, and by date words", () => {
    expect(find("september")).toEqual(["b"]);
    expect(find("października")).toEqual(["c", "a"]);
    expect(find("this week")).toEqual(["a"]);
    expect(find("last week")).toEqual([]);
    expect(find("2026-09")).toEqual(["b"]);
    expect(find("wrzesień")).toEqual(["b"]);
    expect(find("wrzesien")).toEqual(["b"]);
    expect(find("pazdziernika")).toEqual(find("października"));
  });

  it("finds past outings with no fish, and joins parts with +", () => {
    expect(find("no fish")).toEqual(["b"]);
    expect(find("bez ryb")).toEqual(["b"]);
    expect(find("bez ryby")).toEqual(["b"]);
    expect(find("october + run")).toEqual([]);
    expect(find("october + next")).toEqual(["c"]);
  });
});
