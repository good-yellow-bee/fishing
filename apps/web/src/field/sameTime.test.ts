import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { sameTimeText } from "./WaterTipsBox";
import { SAME_TIME_DAYS, thisWeekInPastYears } from "./yearsAgo";

describe("this time of year at a water", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, at: Date, lure: string) => ({ ...base, id, lure, species: "Northern pike", caughtAt: at.toISOString() });
  const catches = [
    fish("a", new Date(2025, 9, 5, 9), "Spinnerbait"),
    fish("b", new Date(2024, 9, 28, 9), "Spinnerbait"),
    fish("c", new Date(2025, 8, 1, 9), "Jig"),
  ];

  it("reaches a fortnight either side of the day in earlier years", () => {
    const found = thisWeekInPastYears(catches, new Date(2026, 9, 17, 12), SAME_TIME_DAYS, Infinity).map((entry) => entry.id);
    expect(found.sort()).toEqual(["a", "b"]);
  });

  it("names the lure that took most of them, once it took two", () => {
    expect(sameTimeText(catches.slice(0, 2))).toBe("Around this date in earlier years here: 2 fish, Northern pike. Most on Spinnerbait.");
    expect(sameTimeText(catches.slice(0, 1))).toBe("Around this date in earlier years here: 1 fish, Northern pike.");
  });
});
