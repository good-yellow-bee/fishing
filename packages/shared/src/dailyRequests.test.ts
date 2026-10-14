import { describe, expect, it } from "vitest";
import {
  dailyRequestLabel,
  dailyRequestProgress,
  dailyRequestsForDay,
  isDailyRequest,
  seasonForDay,
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

describe("daily requests by season", () => {
  const yearOf = (year: number) =>
    Array.from({ length: 365 }, (_, index) => new Date(Date.UTC(year, 0, 1 + index)).toISOString().slice(0, 10));
  const stretchShare = (id: string, season: string) => {
    const boards = [2026, 2027, 2028].flatMap(yearOf).filter((day) => seasonForDay(day) === season).map(dailyRequestsForDay);
    return boards.filter((board) => board[2]!.id === id).length / boards.length;
  };

  it("reads the season off the board day's month", () => {
    expect(seasonForDay("2026-10-14")).toBe("fall");
    expect(seasonForDay("2026-01-31")).toBe("winter");
    expect(seasonForDay("2026-03-01")).toBe("spring");
    expect(seasonForDay("2026-08-31")).toBe("summer");
    expect(seasonForDay("2026-12-01")).toBe("winter");
  });

  it("asks for salmon in their fall run and burbot under the winter ice far more than out of season", () => {
    expect(stretchShare("salmon-run", "fall")).toBeGreaterThan(stretchShare("salmon-run", "spring") * 2.5);
    expect(stretchShare("burbot-dropoff", "winter")).toBeGreaterThan(stretchShare("burbot-dropoff", "summer") * 2.5);
    expect(stretchShare("carp-heavy", "summer")).toBeGreaterThan(stretchShare("carp-heavy", "winter") * 3);
  });

  it("still asks for every stretch fish at some point in the year", () => {
    const ids = new Set([2026, 2027].flatMap(yearOf).map((day) => dailyRequestsForDay(day)[2]!.id));
    for (const id of ["salmon-run", "burbot-dropoff", "carp-heavy", "crappie-dock", "whitefish-dropoff", "catfish-dock", "bass-dock"]) {
      expect(ids.has(id), id).toBe(true);
    }
  });
});
