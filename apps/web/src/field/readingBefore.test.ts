import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { lastReading, readingBefore } from "./waterTips";

describe("readingBefore", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const at = (id: string, day: number, hour: number, waterTempF: number): CatchEntry => ({
    ...base,
    id,
    caughtAt: new Date(2026, 9, day, hour).toISOString(),
    weather: { sky: "clear", wind: "calm", waterTempF },
  });

  it("takes the latest reading from an earlier day within three weeks", () => {
    const catches = [at("a", 1, 9, 60), at("b", 10, 9, 57), at("c", 14, 8, 55), at("d", 14, 18, 54)];
    const last = lastReading(catches);
    expect(last?.fahrenheit).toBe(54);
    expect(readingBefore(catches, last)?.fahrenheit).toBe(57);
  });

  it("gives nothing when the earlier reading is too old", () => {
    const catches = [at("a", 1, 9, 60), at("b", 30, 9, 50)];
    expect(readingBefore(catches, lastReading(catches))).toBeNull();
  });
});
