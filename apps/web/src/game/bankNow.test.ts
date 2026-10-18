import { describe, expect, it } from "vitest";
import { bankSuitsNow } from "./bankNow";
import type { LureConditions } from "./lureChoice";

const plain: LureConditions = { sky: "partly-cloudy", hour: "day", season: "fall", wind: "light-north", moon: 0.5, rising: false };

describe("bankSuitsNow", () => {
  it.each([
    ["reeds", { season: "spring" }, true],
    ["reeds", { season: "winter", sky: "clear" }, true],
    ["reeds", { season: "winter", sky: "clear", hour: "night" }, false],
    ["dropoff", { season: "summer" }, true],
    ["dropoff", { season: "summer", hour: "dusk" }, false],
    ["dock", { season: "summer", sky: "clear" }, true],
    ["point", { wind: "strong" }, true],
    ["inlet", { sky: "rain" }, true],
    ["open", { season: "summer", sky: "clear" }, false],
    ["dock", {}, false],
    ["reeds", {}, false],
  ] as const)("says whether the %s suits %o", (spot, change, suits) => {
    expect(bankSuitsNow(spot, { ...plain, ...change })).toBe(suits);
  });
});
