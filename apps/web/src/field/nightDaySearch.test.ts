import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { dayMarks } from "./bests/dayMarks";

describe("a day's search after a night session", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const fish = sample.catches[0]!;
  const book = {
    ...sample,
    trips: [...sample.trips, { ...sample.trips[0]!, id: "trip-night", spotId: fish.spotId, date: "2026-10-10" }],
    catches: [
      ...sample.catches,
      { ...fish, id: "late-a", tripId: "trip-night", caughtAt: new Date(2026, 9, 10, 22).toISOString() },
      { ...fish, id: "late-b", tripId: "trip-night", caughtAt: new Date(2026, 9, 11, 1).toISOString() },
      { ...fish, id: "loose-c", tripId: null, caughtAt: new Date(2026, 9, 10, 9).toISOString() },
    ],
  };
  const ids = (needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

  it("finds the small hours on the outing's day, as the calendar counts them", () => {
    expect(ids("2026-10-10")).toEqual(["late-a", "late-b", "loose-c"]);
    expect(ids("2026-10-11")).toEqual([]);
    expect(dayMarks(book, "2026").get("2026-10-10")?.fish).toBe(3);
  });
});
