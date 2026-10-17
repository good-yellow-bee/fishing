import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { waterThen } from "./WaterTipsBox";

describe("waterThen", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const at = (waterTempF?: number): CatchEntry => ({ ...base, weather: { sky: "clear", wind: "calm", ...(waterTempF === undefined ? {} : { waterTempF }) } });

  it("names the range of water temperatures noted", () => {
    expect(waterThen([at(54), at(61), at()])).toBe("Water then: 54–61°F.");
    expect(waterThen([at(58.2), at(57.9)])).toBe("Water then: 58°F.");
  });

  it("says nothing when none was noted", () => {
    expect(waterThen([at(), at()])).toBeNull();
  });
});
