import { describe, expect, it } from "vitest";
import { bankSuitsNow } from "./bankNow";
import type { LureConditions } from "./lureChoice";

const plain: LureConditions = { sky: "partly-cloudy", hour: "day", season: "fall", wind: "calm", moon: 0.5, rising: false, date: new Date(2026, 6, 15, 10) };

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
    // A light breeze blowing onto a bank: a north wind onto the near banks, an east wind onto the inlet and reeds, a west wind onto the drop-off.
    ["dock", { wind: "light-north" }, true],
    ["inlet", { wind: "light-north" }, false],
    ["inlet", { wind: "light-east" }, true],
    ["dropoff", { wind: "light-west" }, true],
    // At dawn the low sun at the drop-off angler's back throws their shadow on the water, which outweighs a west breeze.
    ["dropoff", { wind: "light-west", hour: "dawn", sky: "clear" }, false],
    ["dropoff", { wind: "light-west", hour: "dawn", sky: "overcast" }, true],
    ["dock", { wind: "light-south" }, false],
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
