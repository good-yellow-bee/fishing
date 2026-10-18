import { describe, expect, it } from "vitest";
import { bankSuitsNow } from "./bankNow";
import type { LureConditions } from "./lureChoice";

const plain: LureConditions = { sky: "partly-cloudy", hour: "day", season: "fall", wind: "light-north", moon: 0.5, rising: false, date: new Date(2026, 6, 15, 10) };

describe("bankSuitsNow", () => {
  it.each([
    ["reeds", { season: "spring" }, true],
    ["reeds", { season: "winter", sky: "clear" }, true],
    ["reeds", { season: "winter", sky: "clear", hour: "night" }, false],
    ["dropoff", { season: "summer" }, true],
    ["dropoff", { season: "summer", hour: "dusk" }, false],
    ["dock", { season: "summer", sky: "clear" }, true],
    ["dock", { hour: "night" }, true],
    ["dock", { hour: "dusk" }, false],
    ["point", { wind: "strong" }, true],
    ["inlet", { sky: "rain" }, true],
    ["open", { season: "summer", sky: "clear" }, false],
    ["dock", {}, false],
    ["reeds", {}, false],
    // While the lake turns over (October 25, 2026) only the inlet's fresh water bites sooner, and only in fall.
    ["inlet", { date: new Date(2026, 9, 25, 10) }, true],
    ["inlet", { season: "spring", date: new Date(2026, 9, 25, 10) }, false],
  ] as const)("says whether the %s suits %o", (spot, change, suits) => {
    expect(bankSuitsNow(spot, { ...plain, ...change })).toBe(suits);
  });
});
