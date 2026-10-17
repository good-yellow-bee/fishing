import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry, type Trip } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";

describe("loose in a search", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const base = sample.catches[0]!;
  const trip: Trip = { ...sample.trips[0]!, id: "trip", spotId: "lake", date: "2026-10-10" };
  const fish = (id: string, day: string, tripId: string | null = null): CatchEntry => ({ ...base, id, spotId: "lake", caughtAt: new Date(`${day}T09:00`).toISOString(), tripId });

  it("finds the fish left off an outing that water had that day", () => {
    const catches = [fish("filed", "2026-10-10", "trip"), fish("loose", "2026-10-10"), fish("no-outing", "2026-10-11"), fish("gone", "2026-10-10", "deleted-trip")];
    const book = { spots: [], trips: [trip], catches };
    expect(findCatches(book, "loose", t).map((entry) => entry.id).sort()).toEqual(["gone", "loose"]);
    expect(findCatches(book, "bez wyprawy", t)).toHaveLength(2);
  });
});
