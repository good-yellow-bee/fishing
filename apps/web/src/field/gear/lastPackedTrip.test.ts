import { describe, expect, it } from "vitest";
import type { TackleItem, Trip } from "@stillwater/shared";
import { lastPackedTrip } from "./TackleList";

describe("the bag an outing most likely repeats", () => {
  const trip = (id: string, date: string, spotId: string): Trip => ({ id, date, spotId, title: id, note: "" });
  const item = (tripId: string): TackleItem => ({ id: `i-${tripId}`, tripId, label: "Net", packed: false });
  const trips = [trip("new", "2026-10-20", "cedar"), trip("cedar-old", "2026-09-01", "cedar"), trip("mill-late", "2026-10-10", "mill")];

  it("takes the last list from the same water before a later one elsewhere", () => {
    expect(lastPackedTrip(trips, [item("cedar-old"), item("mill-late")], "new")?.id).toBe("cedar-old");
  });

  it("falls back to the latest list anywhere", () => {
    expect(lastPackedTrip(trips, [item("mill-late")], "new")?.id).toBe("mill-late");
    expect(lastPackedTrip(trips, [], "new")).toBeNull();
  });
});
