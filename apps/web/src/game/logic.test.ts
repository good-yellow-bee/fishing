import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { castIntoSchool, castIntoSpooked, castOverGroundbait, castOnFreshWater, FRESH_WAIT, castUnderPressure, fishedHardBanks, PRESSURE_CASTS, PRESSURE_REST, GROUNDBAIT_CASTS, GROUNDBAIT_FEEDERS, GROUNDBAIT_FEEDER_SHARE, groundbaitFeeder, GROUNDBAIT_WAIT, CHOP_WAIT, chopWaitMul, STORM_WAIT, stormWaitMul, CRANK_ROCK_WAIT, crankRockWaitMul, TOPWATER_NIGHT_WAIT, topwaterNightWaitMul, stackWaitMs, WAIT_FLOOR_MS, SPINNER_THUMP_WAIT, spinnerThumpWaitMul, FLY_HATCH_WAIT, flyHatchWaitMul, WORM_NIGHT_WAIT, wormNightWaitMul, JIG_SOLID, SPOOK_WAIT, hookWindowMs, isLightHook, isPerfectCast, LIGHT_HOOK_SHARE, isSolidStrike, SCHOOL_CASTS, SCHOOL_SAME, SCHOOL_WAIT, SCHOOLERS, schoolAfterLanding, GROUNDBAIT_SCHOOL_CASTS, TWILIGHT_SCHOOL_CASTS, WINTER_SCHOOL_CASTS, WINTER_SCHOOLERS, isWinterSchool, solidStrikeMs, WIND_STRIKE, perfectCastBand, PERFECT_CAST_WAIT, sweetBand, FLY_DRIFT_WAIT, flyDriftWaitMul, JIG_LEDGE_WAIT, jigWaitMul, JIG_WINTER_WAIT, jigWinterWaitMul, SPRING_SHALLOWS_WAIT, springShallowsWaitMul, RAIN_INLET_WAIT, rainInletWaitMul, FALL_BIG_LURE_WAIT, fallBigLureWaitMul, SUMMER_DEEP_WAIT, summerDeepWaitMul, DOCK_SHADE_WAIT, dockShadeWaitMul, WINTER_SUN_WAIT, winterSunWaitMul, WIND_POINT_WAIT, windPointWaitMul, LANTERN_DOCK_WAIT, lanternDockWaitMul, OPEN_GLARE_WAIT, openGlareWaitMul, DARK_NIGHT_WAIT, NEW_MOON, darkNightWaitMul, WORM_PILING_WAIT, wormPilingWaitMul, SPOON_OPEN_WAIT, spoonOpenWaitMul, SPINNER_REED_WAIT, spinnerReedWaitMul, FLOAT_REED_WAIT, floatReedWaitMul, STREAMER_LEDGE_WAIT, streamerLedgeWaitMul, WORM_INLET_WAIT, wormInletWaitMul, SPINNER_INLET_WAIT, spinnerInletWaitMul, CRANK_PILING_WAIT, crankPilingWaitMul, FLASH_SUN_WAIT, FULL_MOON_FLASH, flashWaitMul, TOPWATER_WAIT, topwaterWaitMul, waitMs } from "./logic";

describe("hook window", () => {
  it("leaves a starter over a second to react, and widens with Accuracy", () => {
    expect(hookWindowMs(1)).toBeGreaterThanOrEqual(1_000);
    for (let accuracy = 1; accuracy < 5; accuracy++) {
      expect(hookWindowMs(accuracy + 1)).toBeGreaterThan(hookWindowMs(accuracy));
    }
  });
});

describe("solid strike", () => {
  it("sets the hook solid only on a strike in the first part of the window", () => {
    const ms = hookWindowMs(1);
    expect(isSolidStrike(0, ms)).toBe(true);
    expect(isSolidStrike(350, ms)).toBe(true);
    expect(isSolidStrike(ms * 0.6, ms)).toBe(false);
    // A strike a starter can make on reflex still counts.
    expect(isSolidStrike(300, hookWindowMs(1))).toBe(true);
  });
});

describe("perfect cast", () => {
  it("is the middle of the sweet band, at every Accuracy", () => {
    for (let accuracy = 1; accuracy <= 10; accuracy++) {
      const band = sweetBand(accuracy);
      const middle = (band.min + band.max) / 2;
      expect(isPerfectCast(middle, accuracy)).toBe(true);
      expect(isPerfectCast(band.min, accuracy)).toBe(false);
      expect(isPerfectCast(band.max, accuracy)).toBe(false);
    }
  });

  it("brings the bite sooner", () => {
    const random = Math.random;
    Math.random = () => 0.5;
    try {
      expect(waitMs(1, "day", false, 1, false, false, false, true)).toBeCloseTo(waitMs(1, "day") * PERFECT_CAST_WAIT, 6);
    } finally {
      Math.random = random;
    }
  });
});

describe("level 11 and 12 strike and cast help", () => {
  it("gives a level 11 angler a longer hook window and a level 12 angler a wider perfect cast", () => {
    expect(hookWindowMs(1, false, 11)).toBe(Math.round(hookWindowMs(1) * 1.2));
    expect(hookWindowMs(1, true, 11)).toBe(hookWindowMs(1, false, 11) + 400);
    const narrow = perfectCastBand(1);
    const wide = perfectCastBand(1, 12);
    expect(wide.max - wide.min).toBeGreaterThan(narrow.max - narrow.min);
    expect(isPerfectCast(wide.max - 0.001, 1, 12)).toBe(true);
    expect(isPerfectCast(wide.max - 0.001, 1)).toBe(false);
  });
});

describe("a light hook", () => {
  it("comes only from a strike in the last quarter of the window", () => {
    expect(isLightHook(999 * LIGHT_HOOK_SHARE, 999)).toBe(false);
    expect(isLightHook(1000 * LIGHT_HOOK_SHARE + 1, 1000)).toBe(true);
    expect(isLightHook(200, 1000)).toBe(false);
  });
});

describe("a solid strike in the wind", () => {
  it("needs a quicker strike on a breezy day, and quicker still on a strong one", () => {
    const ms = hookWindowMs(1);
    expect(solidStrikeMs(ms, "breezy")).toBeCloseTo(solidStrikeMs(ms) * WIND_STRIKE.breezy);
    expect(solidStrikeMs(ms, "strong")).toBeCloseTo(solidStrikeMs(ms) * WIND_STRIKE.strong);
    expect(solidStrikeMs(ms, "strong")).toBeLessThan(solidStrikeMs(ms, "breezy"));
  });

  it("leaves a calm day's solid strike as it was", () => {
    const ms = hookWindowMs(2);
    expect(solidStrikeMs(ms)).toBeCloseTo(ms * 0.4);
  });
});

describe("a school of panfish", () => {
  it("stays at the bank for a couple of casts after a schooler is landed", () => {
    const school = schoolAfterLanding("perch", "dock");
    expect(school).toEqual({ spot: "dock", id: "perch", casts: SCHOOL_CASTS });
    const first = castIntoSchool(school, "dock");
    expect(first.schoolId).toBe("perch");
    const second = castIntoSchool(first.next, "dock");
    expect(second.schoolId).toBe("perch");
    expect(second.next).toBeNull();
    expect(castIntoSchool(second.next, "dock").schoolId).toBeNull();
  });

  it("is left behind at another bank", () => {
    const moved = castIntoSchool(schoolAfterLanding("bluegill", "dock"), "reeds");
    expect(moved.schoolId).toBeNull();
    expect(moved.next).toBeNull();
  });

  it("only forms for schooling fish", () => {
    expect(schoolAfterLanding("pike", "reeds")).toBeNull();
    expect(schoolAfterLanding("golden-shiner", "reeds")?.casts).toBe(SCHOOL_CASTS);
    for (const id of SCHOOLERS) expect(FISH.some((fish) => fish.id === id && fish.rarity === "common")).toBe(true);
    expect(SCHOOL_SAME).toBeGreaterThan(0);
    expect(SCHOOL_WAIT).toBeLessThan(1);
  });
});

describe("a topwater lure in the wind", () => {
  it("bites sooner on glassy water and slower in a strong chop", () => {
    expect(topwaterWaitMul(true, "calm")).toBe(TOPWATER_WAIT.calm);
    expect(topwaterWaitMul(true, "strong")).toBe(TOPWATER_WAIT.strong);
    expect(TOPWATER_WAIT.calm).toBeLessThan(1);
    expect(TOPWATER_WAIT.strong).toBeGreaterThan(1);
  });

  it("leaves a light breeze, and any lure that sinks, alone", () => {
    expect(topwaterWaitMul(true, "breezy")).toBe(1);
    expect(topwaterWaitMul(true, "light-west")).toBe(1);
    expect(topwaterWaitMul(true, undefined)).toBe(1);
    expect(topwaterWaitMul(false, "strong")).toBe(1);
    expect(topwaterWaitMul(false, "calm")).toBe(1);
  });
});

describe("a flashing lure in the sun", () => {
  it("bites sooner on a spinner or spoon under a clear sky from dawn to dusk", () => {
    expect(FLASH_SUN_WAIT).toBeLessThan(1);
    expect(flashWaitMul("Inline spinner", "clear", "day")).toBe(FLASH_SUN_WAIT);
    expect(flashWaitMul("Kastmaster spoon", "clear", "dawn")).toBe(FLASH_SUN_WAIT);
  });

  it("leaves the night, a cloudy sky and every other lure alone", () => {
    expect(flashWaitMul("Inline spinner", "clear", "night")).toBe(1);
    expect(flashWaitMul("Inline spinner", "clear", "night", FULL_MOON_FLASH)).toBe(FLASH_SUN_WAIT);
    expect(flashWaitMul("Inline spinner", "clear", "night", FULL_MOON_FLASH - 0.01)).toBe(1);
    expect(flashWaitMul("Inline spinner", "overcast", "night", 1)).toBe(1);
    expect(flashWaitMul("Inline spinner", "overcast", "day")).toBe(1);
    expect(flashWaitMul("Inline spinner", undefined, "day")).toBe(1);
    expect(flashWaitMul("Nightcrawler", "clear", "day")).toBe(1);
    expect(flashWaitMul(undefined, "clear", "day")).toBe(1);
  });
});

describe("a jig at the drop-off", () => {
  it("bites sooner hopped down the ledge, and nowhere else or on any other lure", () => {
    expect(JIG_LEDGE_WAIT).toBeLessThan(1);
    expect(jigWaitMul("Green pumpkin tube", "dropoff")).toBe(JIG_LEDGE_WAIT);
    expect(jigWaitMul("Green pumpkin tube", "dock")).toBe(1);
    expect(jigWaitMul("Nightcrawler", "dropoff")).toBe(1);
    expect(jigWaitMul(undefined, "dropoff")).toBe(1);
  });
});

describe("a fly on the inlet's current", () => {
  it("bites sooner for a fly or streamer at the inlet, and nowhere else or on any other lure", () => {
    expect(FLY_DRIFT_WAIT).toBeLessThan(1);
    expect(flyDriftWaitMul("Pheasant tail nymph", "inlet")).toBe(FLY_DRIFT_WAIT);
    expect(flyDriftWaitMul("Woolly bugger", "inlet")).toBe(FLY_DRIFT_WAIT);
    expect(flyDriftWaitMul("Pheasant tail nymph", "dock")).toBe(1);
    expect(flyDriftWaitMul("Inline spinner", "inlet")).toBe(1);
    expect(flyDriftWaitMul(undefined, "inlet")).toBe(1);
  });
});

describe("spooked water", () => {
  it("slows only the next cast at the bank where the fish was lost", () => {
    expect(SPOOK_WAIT).toBeGreaterThan(1);
    expect(castIntoSpooked("dock", "dock")).toBe(true);
    expect(castIntoSpooked("dock", "reeds")).toBe(false);
    expect(castIntoSpooked(null, "dock")).toBe(false);
  });
});

describe("a crankbait off the point", () => {
  it("bites sooner banging off the rocks, and nowhere else or on any other lure", () => {
    expect(CRANK_ROCK_WAIT).toBeLessThan(1);
    expect(crankRockWaitMul("Shallow crankbait", "point")).toBe(CRANK_ROCK_WAIT);
    expect(crankRockWaitMul("Shallow crankbait", "dropoff")).toBe(1);
    expect(crankRockWaitMul("Green pumpkin tube", "point")).toBe(1);
    expect(crankRockWaitMul(undefined, "point")).toBe(1);
  });
});

describe("a jig's stout hook", () => {
  it("sets solid over a longer share of the window, on a jig only", () => {
    expect(JIG_SOLID).toBeGreaterThan(1);
    expect(solidStrikeMs(1000, undefined, "Green pumpkin tube")).toBeCloseTo(solidStrikeMs(1000) * JIG_SOLID);
    expect(solidStrikeMs(1000, "strong", "Green pumpkin tube")).toBeCloseTo(solidStrikeMs(1000, "strong") * JIG_SOLID);
    expect(solidStrikeMs(1000, undefined, "Nightcrawler")).toBe(solidStrikeMs(1000));
  });
});

describe("a worm after dark", () => {
  it("bites sooner at night, and only on a worm", () => {
    expect(WORM_NIGHT_WAIT).toBeLessThan(1);
    expect(wormNightWaitMul("Nightcrawler", "night")).toBe(WORM_NIGHT_WAIT);
    expect(wormNightWaitMul("Leech", "night")).toBe(WORM_NIGHT_WAIT);
    expect(wormNightWaitMul("Nightcrawler", "day")).toBe(1);
    expect(wormNightWaitMul("Nightcrawler", "dusk")).toBe(1);
    expect(wormNightWaitMul("Inline spinner", "night")).toBe(1);
    expect(wormNightWaitMul(undefined, "night")).toBe(1);
  });
});

describe("a fly on a rise", () => {
  it("matches the hatch and bites sooner on a rise, on a fly only", () => {
    expect(FLY_HATCH_WAIT).toBeLessThan(1);
    expect(flyHatchWaitMul("Pheasant tail nymph", true)).toBe(FLY_HATCH_WAIT);
    expect(flyHatchWaitMul("Pheasant tail nymph", false)).toBe(1);
    expect(flyHatchWaitMul("Woolly bugger", true)).toBe(1);
    expect(flyHatchWaitMul("Nightcrawler", true)).toBe(1);
    expect(flyHatchWaitMul(undefined, true)).toBe(1);
  });
});

describe("a spinner in murky light", () => {
  it("bites sooner in rain or fog, on a spinner only", () => {
    expect(SPINNER_THUMP_WAIT).toBeLessThan(1);
    expect(spinnerThumpWaitMul("Inline spinner", "rain")).toBe(SPINNER_THUMP_WAIT);
    expect(spinnerThumpWaitMul("Inline spinner", "fog")).toBe(SPINNER_THUMP_WAIT);
    expect(spinnerThumpWaitMul("Inline spinner", "clear")).toBe(1);
    expect(spinnerThumpWaitMul("Kastmaster spoon", "rain")).toBe(1);
    expect(spinnerThumpWaitMul(undefined, "rain")).toBe(1);
  });
});

describe("a jig in winter", () => {
  it("bites sooner in winter, on a jig only", () => {
    expect(JIG_WINTER_WAIT).toBeLessThan(1);
    expect(jigWinterWaitMul("Green pumpkin tube", "winter")).toBe(JIG_WINTER_WAIT);
    expect(jigWinterWaitMul("Green pumpkin tube", "summer")).toBe(1);
    expect(jigWinterWaitMul("Green pumpkin tube", undefined)).toBe(1);
    expect(jigWinterWaitMul("Inline spinner", "winter")).toBe(1);
    expect(jigWinterWaitMul(undefined, "winter")).toBe(1);
  });
});

describe("the reeds in spring", () => {
  it("bite sooner in spring, at the reeds only, on any lure", () => {
    expect(SPRING_SHALLOWS_WAIT).toBeLessThan(1);
    expect(springShallowsWaitMul("reeds", "spring")).toBe(SPRING_SHALLOWS_WAIT);
    expect(springShallowsWaitMul("reeds", "summer")).toBe(1);
    expect(springShallowsWaitMul("reeds", undefined)).toBe(1);
    expect(springShallowsWaitMul("dock", "spring")).toBe(1);
  });

  it("brings the bite sooner at the inlet only in rain", () => {
    expect(RAIN_INLET_WAIT).toBeLessThan(1);
    expect(rainInletWaitMul("inlet", "rain")).toBe(RAIN_INLET_WAIT);
    expect(rainInletWaitMul("inlet", "clear")).toBe(1);
    expect(rainInletWaitMul("inlet", undefined)).toBe(1);
    expect(rainInletWaitMul("reeds", "rain")).toBe(1);
  });
});

describe("a big lure in fall", () => {
  it("bites sooner in fall, on a big lure only", () => {
    expect(FALL_BIG_LURE_WAIT).toBeLessThan(1);
    expect(fallBigLureWaitMul("Kastmaster spoon", "fall")).toBe(FALL_BIG_LURE_WAIT);
    expect(fallBigLureWaitMul("Woolly bugger", "fall")).toBe(FALL_BIG_LURE_WAIT);
    expect(fallBigLureWaitMul("Kastmaster spoon", "summer")).toBe(1);
    expect(fallBigLureWaitMul("Nightcrawler", "fall")).toBe(1);
    expect(fallBigLureWaitMul(undefined, "fall")).toBe(1);
  });
});

describe("the drop-off on a summer day", () => {
  it("bites sooner in the heat of a summer day, at the drop-off only", () => {
    expect(SUMMER_DEEP_WAIT).toBeLessThan(1);
    expect(summerDeepWaitMul("dropoff", "summer", "day")).toBe(SUMMER_DEEP_WAIT);
    expect(summerDeepWaitMul("dropoff", "summer", "dusk")).toBe(1);
    expect(summerDeepWaitMul("dropoff", "fall", "day")).toBe(1);
    expect(summerDeepWaitMul("reeds", "summer", "day")).toBe(1);
    expect(summerDeepWaitMul("dropoff", undefined, "day")).toBe(1);
  });
});

describe("the dock on a bright summer day", () => {
  it("bites sooner under a clear summer sky by day, at the dock only", () => {
    expect(DOCK_SHADE_WAIT).toBeLessThan(1);
    expect(dockShadeWaitMul("dock", "summer", "day", "clear")).toBe(DOCK_SHADE_WAIT);
    expect(dockShadeWaitMul("dock", "summer", "day", "overcast")).toBe(1);
    expect(dockShadeWaitMul("dock", "summer", "dusk", "clear")).toBe(1);
    expect(dockShadeWaitMul("dock", "spring", "day", "clear")).toBe(1);
    expect(dockShadeWaitMul("reeds", "summer", "day", "clear")).toBe(1);
    expect(dockShadeWaitMul("dock", undefined, "day", "clear")).toBe(1);
  });
});

describe("the reeds on a clear winter day", () => {
  it("bites sooner under a clear winter sky by day, at the reeds only", () => {
    expect(WINTER_SUN_WAIT).toBeLessThan(1);
    expect(winterSunWaitMul("reeds", "winter", "day", "clear")).toBe(WINTER_SUN_WAIT);
    expect(winterSunWaitMul("reeds", "winter", "day", "overcast")).toBe(1);
    expect(winterSunWaitMul("reeds", "winter", "dawn", "clear")).toBe(1);
    expect(winterSunWaitMul("reeds", "summer", "day", "clear")).toBe(1);
    expect(winterSunWaitMul("dock", "winter", "day", "clear")).toBe(1);
    expect(winterSunWaitMul("reeds", undefined, "day", "clear")).toBe(1);
  });
});

describe("the point on a strong wind", () => {
  it("bites sooner off the point in a strong wind only", () => {
    expect(WIND_POINT_WAIT).toBeLessThan(1);
    expect(windPointWaitMul("point", "strong")).toBe(WIND_POINT_WAIT);
    expect(windPointWaitMul("point", "breezy")).toBe(1);
    expect(windPointWaitMul("point", undefined)).toBe(1);
    expect(windPointWaitMul("dock", "strong")).toBe(1);
  });
});

describe("groundbait", () => {
  it("feeds the bank it was tossed off for a few casts, and keeps while the angler fishes elsewhere", () => {
    expect(GROUNDBAIT_WAIT).toBeLessThan(1);
    let bait: ReturnType<typeof castOverGroundbait>["next"] = { spot: "reeds", casts: GROUNDBAIT_CASTS };
    expect(castOverGroundbait(bait, "dock")).toEqual({ baited: false, next: bait });
    for (let left = GROUNDBAIT_CASTS; left > 0; left -= 1) {
      const cast = castOverGroundbait(bait, "reeds");
      expect(cast.baited).toBe(true);
      bait = cast.next;
    }
    expect(bait).toBeNull();
    expect(castOverGroundbait(null, "reeds")).toEqual({ baited: false, next: null });
  });
});

describe("the dock lanterns after dark", () => {
  it("bites sooner off the dock at night only", () => {
    expect(LANTERN_DOCK_WAIT).toBeLessThan(1);
    expect(lanternDockWaitMul("dock", "night")).toBe(LANTERN_DOCK_WAIT);
    expect(lanternDockWaitMul("dock", "dusk")).toBe(1);
    expect(lanternDockWaitMul("dock", "day")).toBe(1);
    expect(lanternDockWaitMul("reeds", "night")).toBe(1);
  });
});

describe("the open water at a summer midday", () => {
  it("bites slower out on the boat under a clear summer sky by day only", () => {
    expect(OPEN_GLARE_WAIT).toBeGreaterThan(1);
    expect(openGlareWaitMul("open", "summer", "day", "clear")).toBe(OPEN_GLARE_WAIT);
    expect(openGlareWaitMul("open", "summer", "day", "overcast")).toBe(1);
    expect(openGlareWaitMul("open", "summer", "dusk", "clear")).toBe(1);
    expect(openGlareWaitMul("open", "fall", "day", "clear")).toBe(1);
    expect(openGlareWaitMul("dock", "summer", "day", "clear")).toBe(1);
  });
});

describe("a moonless night", () => {
  it("bites slower at night under a new moon only", () => {
    expect(DARK_NIGHT_WAIT).toBeGreaterThan(1);
    expect(darkNightWaitMul("night", 0)).toBe(DARK_NIGHT_WAIT);
    expect(darkNightWaitMul("night", NEW_MOON)).toBe(DARK_NIGHT_WAIT);
    expect(darkNightWaitMul("night", 0.5)).toBe(1);
    expect(darkNightWaitMul("night", undefined)).toBe(1);
    expect(darkNightWaitMul("dusk", 0)).toBe(1);
  });
});

describe("a worm by the dock's pilings", () => {
  it("bites sooner on a worm at the dock only", () => {
    expect(WORM_PILING_WAIT).toBeLessThan(1);
    expect(wormPilingWaitMul("Nightcrawler", "dock")).toBe(WORM_PILING_WAIT);
    expect(wormPilingWaitMul("Nightcrawler", "reeds")).toBe(1);
    expect(wormPilingWaitMul("Green pumpkin tube", "dock")).toBe(1);
    expect(wormPilingWaitMul(undefined, "dock")).toBe(1);
  });
});

describe("a spoon in the open water", () => {
  it("bites sooner on a spoon out on the boat only", () => {
    expect(SPOON_OPEN_WAIT).toBeLessThan(1);
    expect(spoonOpenWaitMul("Kastmaster spoon", "open")).toBe(SPOON_OPEN_WAIT);
    expect(spoonOpenWaitMul("Kastmaster spoon", "dock")).toBe(1);
    expect(spoonOpenWaitMul("Nightcrawler", "open")).toBe(1);
    expect(spoonOpenWaitMul(undefined, "open")).toBe(1);
  });
});

describe("a spinner along the reeds", () => {
  it("bites sooner on a spinner at the reeds only", () => {
    expect(SPINNER_REED_WAIT).toBeLessThan(1);
    expect(spinnerReedWaitMul("Inline spinner", "reeds")).toBe(SPINNER_REED_WAIT);
    expect(spinnerReedWaitMul("Inline spinner", "dock")).toBe(1);
    expect(spinnerReedWaitMul("Nightcrawler", "reeds")).toBe(1);
    expect(spinnerReedWaitMul(undefined, "reeds")).toBe(1);
  });
});

describe("a float rig at the reeds", () => {
  it("bites sooner on a float rig at the reeds only", () => {
    expect(FLOAT_REED_WAIT).toBeLessThan(1);
    expect(floatReedWaitMul("Pencil bobbers", "reeds")).toBe(FLOAT_REED_WAIT);
    expect(floatReedWaitMul("Pencil bobbers", "dock")).toBe(1);
    expect(floatReedWaitMul("Inline spinner", "reeds")).toBe(1);
    expect(floatReedWaitMul(undefined, "reeds")).toBe(1);
  });
});

describe("a streamer off the drop-off", () => {
  it("bites sooner on a streamer off the drop-off only", () => {
    expect(STREAMER_LEDGE_WAIT).toBeLessThan(1);
    expect(streamerLedgeWaitMul("Woolly bugger", "dropoff")).toBe(STREAMER_LEDGE_WAIT);
    expect(streamerLedgeWaitMul("Woolly bugger", "inlet")).toBe(1);
    expect(streamerLedgeWaitMul("Tube jig", "dropoff")).toBe(1);
    expect(streamerLedgeWaitMul(undefined, "dropoff")).toBe(1);
  });
});

describe("a worm in the inlet's current", () => {
  it("bites sooner on a worm at the inlet only", () => {
    expect(WORM_INLET_WAIT).toBeLessThan(1);
    expect(wormInletWaitMul("Nightcrawler", "inlet")).toBe(WORM_INLET_WAIT);
    expect(wormInletWaitMul("Nightcrawler", "reeds")).toBe(1);
    expect(wormInletWaitMul("Inline spinner", "inlet")).toBe(1);
    expect(wormInletWaitMul(undefined, "inlet")).toBe(1);
  });
});

describe("a spinner in the inlet's current", () => {
  it("bites sooner on a spinner at the inlet only", () => {
    expect(SPINNER_INLET_WAIT).toBeLessThan(1);
    expect(spinnerInletWaitMul("Inline spinner", "inlet")).toBe(SPINNER_INLET_WAIT);
    expect(spinnerInletWaitMul("Inline spinner", "point")).toBe(1);
    expect(spinnerInletWaitMul("Nightcrawler", "inlet")).toBe(1);
    expect(spinnerInletWaitMul(undefined, "inlet")).toBe(1);
  });
});

describe("a crankbait off the pilings", () => {
  it("bites sooner on a crankbait at the dock only", () => {
    expect(CRANK_PILING_WAIT).toBeLessThan(1);
    expect(crankPilingWaitMul("Shad crankbait", "dock")).toBe(CRANK_PILING_WAIT);
    expect(crankPilingWaitMul("Shad crankbait", "reeds")).toBe(1);
    expect(crankPilingWaitMul("Nightcrawler", "dock")).toBe(1);
    expect(crankPilingWaitMul(undefined, "dock")).toBe(1);
  });
});

describe("a school at dawn and dusk", () => {
  it("stays longer in the low light", () => {
    expect(schoolAfterLanding("perch", "dock", "day")?.casts).toBe(SCHOOL_CASTS);
    expect(schoolAfterLanding("perch", "dock", "night")?.casts).toBe(SCHOOL_CASTS);
    expect(schoolAfterLanding("perch", "dock", "dawn")?.casts).toBe(SCHOOL_CASTS + TWILIGHT_SCHOOL_CASTS);
    expect(schoolAfterLanding("perch", "dock", "dusk")?.casts).toBe(SCHOOL_CASTS + TWILIGHT_SCHOOL_CASTS);
    expect(schoolAfterLanding("pike", "dock", "dusk")).toBeNull();
  });

  it("keeps a perch's big winter school in a cast longer", () => {
    for (const id of WINTER_SCHOOLERS) expect(isWinterSchool(id, "winter")).toBe(true);
    expect(schoolAfterLanding("perch", "dock", "day", "winter")?.casts).toBe(SCHOOL_CASTS + WINTER_SCHOOL_CASTS);
    expect(schoolAfterLanding("perch", "dock", "day", "summer")?.casts).toBe(SCHOOL_CASTS);
    expect(schoolAfterLanding("bluegill", "dock", "day", "winter")?.casts).toBe(SCHOOL_CASTS);
  });

  it("keeps a school landed over groundbait in a cast longer", () => {
    expect(schoolAfterLanding("bluegill", "dock", "day", "summer", true)?.casts).toBe(SCHOOL_CASTS + GROUNDBAIT_SCHOOL_CASTS);
    expect(schoolAfterLanding("perch", "dock", "dusk", "winter", true)?.casts).toBe(SCHOOL_CASTS + TWILIGHT_SCHOOL_CASTS + WINTER_SCHOOL_CASTS + GROUNDBAIT_SCHOOL_CASTS);
    expect(schoolAfterLanding("pike", "dock", "day", "summer", true)).toBeNull();
  });
});

describe("a breezy day's chop", () => {
  it("bites sooner on a breezy day, on any lure but a topwater", () => {
    expect(CHOP_WAIT).toBeLessThan(1);
    expect(chopWaitMul(false, "breezy")).toBe(CHOP_WAIT);
    expect(chopWaitMul(true, "breezy")).toBe(1);
    expect(chopWaitMul(false, "calm")).toBe(1);
    expect(chopWaitMul(false, "strong")).toBe(1);
    expect(chopWaitMul(false, undefined)).toBe(1);
  });
});

describe("a thunderstorm", () => {
  it("slows every bite in a storm, but not in winter's snow", () => {
    expect(STORM_WAIT).toBeGreaterThan(1);
    expect(stormWaitMul("rain", "summer", "strong")).toBe(STORM_WAIT);
    expect(stormWaitMul("rain", "winter", "strong")).toBe(1);
    expect(stormWaitMul("rain", "summer", "breezy")).toBe(1);
    expect(stormWaitMul("clear", "summer", "strong")).toBe(1);
    expect(stormWaitMul(undefined, undefined, undefined)).toBe(1);
  });
});

describe("stacked wait bonuses", () => {
  it("multiply the wait but never cut it under the floor", () => {
    expect(stackWaitMs(4000, 0.8, 0.75)).toBeCloseTo(2400);
    expect(stackWaitMs(4000)).toBe(4000);
    expect(stackWaitMs(1500, 0.8, 0.75, 0.85)).toBe(WAIT_FLOOR_MS);
    expect(stackWaitMs(1100, 1.4)).toBeCloseTo(1540);
  });
});

describe("a topwater lure after dark", () => {
  it("bites sooner at night, on a topwater only", () => {
    expect(TOPWATER_NIGHT_WAIT).toBeLessThan(1);
    expect(topwaterNightWaitMul(true, "night")).toBe(TOPWATER_NIGHT_WAIT);
    expect(topwaterNightWaitMul(true, "dusk")).toBe(1);
    expect(topwaterNightWaitMul(false, "night")).toBe(1);
  });
});

describe("feeders over the groundbait", () => {
  const rolls = (...values: number[]) => () => values.shift() ?? 0;

  it("draws a feeder from the bank only on the share's roll", () => {
    expect(groundbaitFeeder("dock", undefined, false, "day", rolls(GROUNDBAIT_FEEDER_SHARE))).toBeNull();
    const fish = groundbaitFeeder("dock", undefined, false, "day", rolls(0, 0.99));
    expect(fish && GROUNDBAIT_FEEDERS.has(fish.id)).toBe(true);
    expect(fish?.spots).toContain("dock");
  });

  it("keeps to the lure's size split and a short cast's commons", () => {
    for (let roll = 0; roll < 1; roll += 0.1) {
      const small = groundbaitFeeder("dock", "Worm", false, "day", rolls(0, roll));
      expect(["golden-shiner", "crappie"]).toContain(small?.id);
      expect(groundbaitFeeder("dock", undefined, true, "day", rolls(0, roll))?.rarity).toBe("common");
    }
  });

  it("draws the commons more often than the uncommon feeders, as the bank does", () => {
    const seen = new Map<string, number>();
    for (let roll = 0.005; roll < 1; roll += 0.01) {
      const id = groundbaitFeeder("dock", undefined, false, "day", rolls(0, roll))!.id;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    expect(seen.get("golden-shiner")!).toBeGreaterThan(seen.get("catfish")!);
  });

  it("finds a feeder at every bank", () => {
    for (const spot of ["dock", "reeds", "dropoff", "point", "inlet", "open"] as const) expect(groundbaitFeeder(spot, undefined, false, "day", rolls(0, 0.5))).not.toBeNull();
  });
});

describe("a bank fished hard", () => {
  it("grows wary after its run of casts", () => {
    let pressure = {} as ReturnType<typeof castUnderPressure>["next"];
    const runs: boolean[] = [];
    for (let cast = 0; cast <= PRESSURE_CASTS; cast += 1) {
      const next = castUnderPressure(pressure, "dock");
      runs.push(next.pressured);
      pressure = next.next;
    }
    expect(runs.slice(0, PRESSURE_CASTS).every((pressured) => !pressured)).toBe(true);
    expect(runs.at(-1)).toBe(true);
    expect(fishedHardBanks(pressure)).toEqual(["dock"]);
  });

  it("rests while the angler fishes elsewhere, a few casts at a time", () => {
    const moved = castUnderPressure({ dock: PRESSURE_CASTS + 1, point: PRESSURE_REST }, "reeds");
    expect(moved).toEqual({ pressured: false, next: { dock: PRESSURE_CASTS + 1 - PRESSURE_REST, reeds: 1 } });
    expect(fishedHardBanks(moved.next)).toEqual([]);
    // Back at the dock its count picks up where the rest left it.
    expect(castUnderPressure(moved.next, "dock").next.dock).toBe(PRESSURE_CASTS);
    expect(castUnderPressure(castUnderPressure(moved.next, "dock").next, "dock").pressured).toBe(true);
  });
});

describe("fresh water", () => {
  it("is fresh only on the visit's first cast at each bank, and bites sooner there", () => {
    const first = castOnFreshWater(new Set(), "dock");
    expect(first.fresh).toBe(true);
    expect(castOnFreshWater(first.next, "dock").fresh).toBe(false);
    expect(castOnFreshWater(first.next, "reeds")).toEqual({ fresh: true, next: new Set(["dock", "reeds"]) });
    expect(FRESH_WAIT).toBeLessThan(1);
  });
});
