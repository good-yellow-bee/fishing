import { describe, expect, it } from "vitest";
import type { Trip } from "@stillwater/shared";
import { weekendSplit } from "./outingAverage";

describe("weekendSplit", () => {
  const trip = (id: string, date: string): Trip => ({ id, date, spotId: "s1", title: id, note: "" });
  const fish: Record<string, number> = { sat: 4, sun: 2, tue: 1, wed: 0, next: 9 };
  const trips = [trip("sat", "2026-10-10"), trip("sun", "2026-10-11"), trip("tue", "2026-10-13"), trip("wed", "2026-10-14"), trip("next", "2026-10-24")];

  it("averages fish an outing on weekends and on weekdays, leaving out outings ahead", () => {
    expect(weekendSplit(trips, (id) => fish[id] ?? 0, "2026-10-17")).toEqual({ weekend: 3, weekday: 0.5 });
  });

  it("needs two outings on each side", () => {
    expect(weekendSplit(trips.slice(0, 3), (id) => fish[id] ?? 0, "2026-10-17")).toBeNull();
  });
});
