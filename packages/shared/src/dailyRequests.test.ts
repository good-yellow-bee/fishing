import { describe, expect, it } from "vitest";
import {
  dailyRequestLabel,
  dailyRequestProgress,
  dailyRequestsForDay,
  isDailyRequest,
  type DailyCatch,
  type DailyRequest,
} from "./dailyRequests.ts";
import { fishById } from "./fish.ts";

function days(count: number): string[] {
  return Array.from({ length: count }, (_, index) => new Date(Date.UTC(2026, 9, 1 + index)).toISOString().slice(0, 10));
}

const boardKey = (day: string) => dailyRequestsForDay(day).map((request) => request.id).join(",");

describe("daily requests board", () => {
  it("gives the same board all day", () => {
    expect(dailyRequestsForDay("2026-10-08")).toEqual(dailyRequestsForDay("2026-10-08"));
  });

  it("varies across days well beyond a fixed rotation", () => {
    const month = days(30);
    expect(new Set(month.map(boardKey)).size).toBeGreaterThan(20);
    expect(month.slice(1).filter((day, index) => boardKey(day) === boardKey(month[index]!))).toHaveLength(0);
  });

  it("offers three distinct feasible requests with modest rewards, mixing spot and weight requests over the year", () => {
    const year = days(365).flatMap(dailyRequestsForDay);
    for (const day of days(365)) {
      expect(new Set(dailyRequestsForDay(day).map((request) => request.id)).size).toBe(3);
    }
    expect(year.every(isDailyRequest)).toBe(true);
    expect(year.every((request) => request.reward >= 15 && request.reward <= 40)).toBe(true);
    expect(year.some((request) => request.minWeight !== undefined)).toBe(true);
    expect(year.some((request) => request.spot !== undefined)).toBe(true);
  });

  it("leads with two requests a strength 1 angler can land on open banks", () => {
    for (const day of days(120)) {
      for (const request of dailyRequestsForDay(day).slice(0, 2)) {
        expect(fishById(request.speciesId)!.minStrength).toBe(1);
        expect(request.spot).not.toBe("dropoff");
      }
    }
  });
});

describe("daily request progress", () => {
  const shiners: DailyRequest = { id: "shiners", speciesId: "golden-shiner", spot: "dock", count: 2, reward: 15 };
  const carp: DailyRequest = { id: "carp", speciesId: "carp", minWeight: 8, count: 1, reward: 40 };

  it("counts only the species at the asked bank, capped at the count", () => {
    const shiner = (spot: string): DailyCatch => ({ speciesId: "golden-shiner", spot, weight: 0.3 });
    expect(dailyRequestProgress(shiners, [shiner("dock"), shiner("reeds"), { speciesId: "perch", spot: "dock", weight: 0.5 }])).toBe(1);
    expect(dailyRequestProgress(shiners, [shiner("dock"), shiner("dock"), shiner("dock")])).toBe(2);
  });

  it("counts a weight request from any bank only when strictly over the threshold", () => {
    const fish = (weight: number, spot = "dock"): DailyCatch => ({ speciesId: "carp", spot, weight });
    expect(dailyRequestProgress(carp, [fish(8)])).toBe(0);
    expect(dailyRequestProgress(carp, [fish(8.1, "reeds")])).toBe(1);
  });
});

describe("daily request labels", () => {
  it("names the fish, size, and bank", () => {
    expect(dailyRequestLabel({ id: "a", speciesId: "carp", minWeight: 8, count: 1, reward: 40 })).toBe("A common carp over 8 lb");
    expect(dailyRequestLabel({ id: "b", speciesId: "golden-shiner", spot: "reeds", count: 3, reward: 15 })).toBe(
      "3 × golden shiner at the Reeds",
    );
    expect(dailyRequestLabel({ id: "c", speciesId: "perch", spot: "dropoff", count: 1, reward: 25 })).toBe(
      "A yellow perch at the Drop-off",
    );
  });
});
