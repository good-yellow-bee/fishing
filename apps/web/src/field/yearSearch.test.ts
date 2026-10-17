import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";

describe("a year in a search", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const base = sample.catches[0]!;
  const fish = (id: string, iso: string, tripId: string | null = null): CatchEntry => ({ ...base, id, caughtAt: new Date(iso).toISOString(), tripId, note: "" });

  it("finds that year's fish, not a title or note with the number", () => {
    const trip = { ...sample.trips[0]!, id: "t", title: "Opening day 2025 rematch", date: "2026-05-01" };
    const catches = [fish("old", "2025-06-01T09:00"), fish("new", "2026-05-01T09:00", "t"), { ...fish("noted", "2024-06-01T09:00"), note: "like 2025" }];
    expect(findCatches({ spots: sample.spots, trips: [trip], catches }, "2025", t).map((entry) => entry.id)).toEqual(["old"]);
  });
});
