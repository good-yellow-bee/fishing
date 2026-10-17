import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { setUnits } from "../i18n";
import { waterRange } from "./WaterTipsBox";

describe("waterRange", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const at = (waterTempF: number): CatchEntry => ({ ...base, weather: { sky: "clear", wind: "calm", waterTempF } });
  afterEach(() => setUnits("imperial"));

  it("rounds once, in the reader's own units", () => {
    setUnits("metric");
    // 59.54°F is 15.3°C: rounding to 60°F first would read 16°C.
    expect(waterRange([at(59.54)])).toBe("15°C");
    setUnits("imperial");
    expect(waterRange([at(59.54), at(59.6)])).toBe("60°F");
  });
});
