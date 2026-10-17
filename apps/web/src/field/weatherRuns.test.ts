import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchWeather } from "@stillwater/shared";
import { weatherRuns } from "./Weather";

describe("an outing's weather in time order", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, hour: number, weather: CatchWeather | null) => ({ ...base, id, caughtAt: new Date(2026, 9, 3, hour).toISOString(), weather });
  const clear = { sky: "clear", wind: "calm" } as CatchWeather;
  const rain = { sky: "rain", wind: "calm" } as CatchWeather;

  it("starts a run when the sky or wind changes, counting its fish and keeping its first temperature", () => {
    const runs = weatherRuns([fish("c", 9, rain), fish("a", 6, null), fish("b", 7, { ...clear, waterTempF: 61 }), fish("d", 8, clear), fish("e", 10, null)]);
    expect(runs.map((run) => [new Date(run.from).getHours(), run.weather.sky, run.weather.waterTempF, run.fish])).toEqual([
      [7, "clear", 61, 3],
      [9, "rain", undefined, 2],
    ]);
  });

  it("has nothing to say when no fish noted the weather", () => {
    expect(weatherRuns([fish("a", 6, null)])).toEqual([]);
  });
});
