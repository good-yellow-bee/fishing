import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { findTrips } from "./tripSearch";

const book = {
  spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }],
  trips: [
    { id: "sat", date: "2026-10-10", spotId: "own", title: "", note: "" },
    { id: "sun", date: "2026-10-11", spotId: "own", title: "", note: "" },
    { id: "wed", date: "2026-10-14", spotId: "own", title: "", note: "" },
  ],
  catches: [],
} as unknown as Logbook;

const ids = (needle: string) => findTrips(book, needle, () => 0, "2026-10-18", (text: string) => text, new Date(2026, 9, 18, 10)).map((trip) => trip.id).sort();

describe("round 76 ideas: the outing search splits weekends from weekdays", () => {
  it("finds Saturday and Sunday outings for “weekend”", () => {
    expect(ids("weekend")).toEqual(["sat", "sun"]);
    expect(ids("weekendy")).toEqual(["sat", "sun"]);
  });

  it("finds the days between for “weekday”", () => {
    expect(ids("weekdays")).toEqual(["wed"]);
    expect(ids("dni powszednie")).toEqual(["wed"]);
  });
});
