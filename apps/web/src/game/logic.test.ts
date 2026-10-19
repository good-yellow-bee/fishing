import { describe, expect, it } from "vitest";
import { FISH, LAKE_CENTER_Z, SPOT_IDS, skyAt, skyTurnForDay, weatherForDay } from "@stillwater/shared";
import { BANK_STANDS } from "./hotspot";
import { castIntoSchool, castIntoSpooked, castOverGroundbait, castOnFreshWater, FRESH_WAIT, castUnderPressure, castNewLure, NEW_LURE_RELIEF, fishedHardBanks, PRESSURE_CASTS, PRESSURE_REST, GROUNDBAIT_CASTS, GROUNDBAIT_FEEDERS, GROUNDBAIT_FEEDER_SHARE, groundbaitFeeder, GROUNDBAIT_WAIT, canBaitShiner, LIVE_SHINER_SHARE, SHINER_HUNTERS, shinerHunter, BED_RAIDERS, BED_RAIDER_SHARE, bedRaider, CHOP_WAIT, chopWaitMul, STORM_WAIT, stormWaitMul, PRE_RAIN_WAIT, preRainWaitMul, TWIST_CASTS, TWIST_TANGLE, twistAfterCast, isTwisted, castTangles, WORM_SOAK_CASTS, WASHED_WAIT, soakAfterCast, isWashedOut, FOG_LIFT_WAIT, fogLiftWaitMul, WATER_SWING_F, WARMING_WAIT, COOLING_WAIT, waterSwing, waterSwingWaitMul, waterTempFor, POST_FRONT_WAIT, POST_FRONT_UNTIL, postFrontWaitMul, rainedYesterday, TURNOVER_DAYS, TURNOVER_SPAN, TURNOVER_WAIT, TURNOVER_INLET_WAIT, isTurnover, turnoverStart, turnoverWaitMul, CRANK_ROCK_WAIT, crankRockWaitMul, DULL_SOLID, isSkipCast, SKIP_CAST_SHARE, TOPWATER_NIGHT_WAIT, topwaterNightWaitMul, stackWaitMs, WAIT_FLOOR_MS, SPINNER_THUMP_WAIT, spinnerThumpWaitMul, FLY_HATCH_WAIT, flyHatchWaitMul, WORM_NIGHT_WAIT, wormNightWaitMul, JIG_SOLID, SPOOK_WAIT, hookWindowMs, isLightHook, isPerfectCast, LIGHT_HOOK_SHARE, isSolidStrike, SCHOOL_CASTS, SCHOOL_SAME, SCHOOL_WAIT, SCHOOLERS, schoolAfterLanding, GROUNDBAIT_SCHOOL_CASTS, TWILIGHT_SCHOOL_CASTS, WINTER_SCHOOL_CASTS, WINTER_SCHOOLERS, isWinterSchool, solidStrikeMs, WIND_STRIKE, perfectCastBand, PERFECT_CAST_WAIT, sweetBand, FLY_DRIFT_WAIT, flyDriftWaitMul, JIG_LEDGE_WAIT, jigWaitMul, JIG_WINTER_WAIT, jigWinterWaitMul, SPRING_SHALLOWS_WAIT, springShallowsWaitMul, RAIN_INLET_WAIT, rainInletWaitMul, FALL_BIG_LURE_WAIT, fallBigLureWaitMul, SUMMER_DEEP_WAIT, summerDeepWaitMul, DOCK_SHADE_WAIT, dockShadeWaitMul, WINTER_SUN_WAIT, winterSunWaitMul, WIND_POINT_WAIT, windPointWaitMul, WINDWARD_WAIT, WINDWARD_BANKS, windwardWaitMul, LANTERN_DOCK_WAIT, lanternDockWaitMul, OPEN_GLARE_WAIT, openGlareWaitMul, LONG_SHADOW_WAIT, longShadowWaitMul, DARK_NIGHT_WAIT, NEW_MOON, darkNightWaitMul, WORM_PILING_WAIT, wormPilingWaitMul, SPOON_OPEN_WAIT, spoonOpenWaitMul, SPINNER_REED_WAIT, spinnerReedWaitMul, FLOAT_REED_WAIT, floatReedWaitMul, STREAMER_LEDGE_WAIT, streamerLedgeWaitMul, WORM_INLET_WAIT, wormInletWaitMul, SPINNER_INLET_WAIT, spinnerInletWaitMul, CRANK_PILING_WAIT, crankPilingWaitMul, FLASH_SUN_WAIT, FULL_MOON_FLASH, flashWaitMul, TOPWATER_WAIT, topwaterWaitMul, waitMs } from "./logic";

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
  });

  it("bites sooner where a light breeze blows onto the bank, and the banks it names face into that wind", () => {
    expect(WINDWARD_WAIT).toBeLessThan(1);
    expect(windwardWaitMul("dock", "light-north")).toBe(WINDWARD_WAIT);
    expect(windwardWaitMul("inlet", "light-east")).toBe(WINDWARD_WAIT);
    expect(windwardWaitMul("dropoff", "light-west")).toBe(WINDWARD_WAIT);
    expect(windwardWaitMul("inlet", "light-north")).toBe(1);
    expect(windwardWaitMul("dock", "light-south")).toBe(1);
    expect(windwardWaitMul("dock", "strong")).toBe(1);
    expect(windwardWaitMul("open", "light-north")).toBe(1);
    expect(windwardWaitMul("dock", undefined)).toBe(1);
    // North is the far shore (-z) and east is +x: a named bank sits squarely on the shore the wind blows toward.
    const toward: Record<string, { x: number; z: number }> = { "light-north": { x: 0, z: 1 }, "light-east": { x: -1, z: 0 }, "light-south": { x: 0, z: -1 }, "light-west": { x: 1, z: 0 } };
    for (const [wind, dir] of Object.entries(toward)) {
      for (const spot of SPOT_IDS.filter((bank) => bank !== "open")) {
        const stand = BANK_STANDS[spot];
        const along = (stand.x * dir.x + (stand.z - LAKE_CENTER_Z) * dir.z) / Math.hypot(stand.x, stand.z - LAKE_CENTER_Z);
        expect(WINDWARD_BANKS[wind]!.includes(spot)).toBe(along > 0.65);
      }
    }
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

describe("the angler's shadow under a low sun", () => {
  it("bites slower at the drop-off at dawn and the inlet at dusk under a clear or partly cloudy sky only", () => {
    expect(LONG_SHADOW_WAIT).toBeGreaterThan(1);
    expect(longShadowWaitMul("dropoff", "dawn", "clear")).toBe(LONG_SHADOW_WAIT);
    expect(longShadowWaitMul("inlet", "dusk", "partly-cloudy")).toBe(LONG_SHADOW_WAIT);
    expect(longShadowWaitMul("dropoff", "dusk", "clear")).toBe(1);
    expect(longShadowWaitMul("inlet", "dawn", "clear")).toBe(1);
    expect(longShadowWaitMul("dropoff", "day", "clear")).toBe(1);
    expect(longShadowWaitMul("dropoff", "dawn", "overcast")).toBe(1);
    expect(longShadowWaitMul("inlet", "dusk", "fog")).toBe(1);
    expect(longShadowWaitMul("dock", "dawn", "clear")).toBe(1);
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

describe("the hour before the rain", () => {
  it("brings the bites sooner only in the overcast hour before the day's rain", () => {
    expect(PRE_RAIN_WAIT).toBeLessThan(1);
    const days = Array.from({ length: 365 }, (_, n) => new Date(2026, 0, 1 + n));
    const wet = days.find((day) => skyTurnForDay(day)?.to === "rain")!;
    const { hour } = skyTurnForDay(wet)!;
    const at = (h: number) => new Date(wet.getFullYear(), wet.getMonth(), wet.getDate(), h, 30);
    expect(preRainWaitMul(at(hour - 1), skyAt(at(hour - 1)))).toBe(PRE_RAIN_WAIT);
    expect(preRainWaitMul(at(hour - 2), skyAt(at(hour - 2)))).toBe(1);
    expect(preRainWaitMul(at(hour), skyAt(at(hour)))).toBe(1);
    expect(preRainWaitMul(at(hour - 1), undefined)).toBe(1);
    const dry = days.find((day) => skyTurnForDay(day) && skyTurnForDay(day)!.to !== "rain")!;
    const dryHour = skyTurnForDay(dry)!.hour - 1;
    const dryAt = new Date(dry.getFullYear(), dry.getMonth(), dry.getDate(), dryHour, 30);
    expect(preRainWaitMul(dryAt, skyAt(dryAt))).toBe(1);
  });
});

describe("the fog burning off", () => {
  it("brings the bites sooner only in the first clear hour after a foggy morning", () => {
    expect(FOG_LIFT_WAIT).toBeLessThan(1);
    const days = Array.from({ length: 365 }, (_, n) => new Date(2026, 0, 1 + n));
    const foggy = days.find((day) => skyTurnForDay(day)?.to === "clear")!;
    const { hour } = skyTurnForDay(foggy)!;
    const at = (h: number) => new Date(foggy.getFullYear(), foggy.getMonth(), foggy.getDate(), h, 30);
    expect(fogLiftWaitMul(at(hour), skyAt(at(hour)))).toBe(FOG_LIFT_WAIT);
    expect(fogLiftWaitMul(at(hour - 1), skyAt(at(hour - 1)))).toBe(1);
    expect(fogLiftWaitMul(at(hour + 1), skyAt(at(hour + 1)))).toBe(1);
    expect(fogLiftWaitMul(at(hour), undefined)).toBe(1);
    const wet = days.find((day) => skyTurnForDay(day)?.to === "rain")!;
    const wetAt = new Date(wet.getFullYear(), wet.getMonth(), wet.getDate(), skyTurnForDay(wet)!.hour, 30);
    expect(fogLiftWaitMul(wetAt, skyAt(wetAt))).toBe(1);
  });
});

describe("the bright morning after the rain", () => {
  it("slows the bites on a clear morning after a day that ended in rain, but not on a jig or worm", () => {
    expect(POST_FRONT_WAIT).toBeGreaterThan(1);
    const days = Array.from({ length: 365 }, (_, n) => new Date(2026, 0, 1 + n));
    const bright = days.find((day) => weatherForDay(day) === "clear" && rainedYesterday(day))!;
    const at = (h: number) => new Date(bright.getFullYear(), bright.getMonth(), bright.getDate(), h, 30);
    expect(postFrontWaitMul(at(8), skyAt(at(8)), "Inline spinner")).toBe(POST_FRONT_WAIT);
    expect(postFrontWaitMul(at(8), skyAt(at(8)), undefined)).toBe(POST_FRONT_WAIT);
    expect(postFrontWaitMul(at(8), skyAt(at(8)), "Twister jig")).toBe(1);
    expect(postFrontWaitMul(at(8), skyAt(at(8)), "Nightcrawlers")).toBe(1);
    expect(postFrontWaitMul(at(POST_FRONT_UNTIL), skyAt(at(POST_FRONT_UNTIL)), "Inline spinner")).toBe(1);
    const dry = days.find((day) => weatherForDay(day) === "clear" && !rainedYesterday(day))!;
    const dryAt = new Date(dry.getFullYear(), dry.getMonth(), dry.getDate(), 8, 30);
    expect(postFrontWaitMul(dryAt, skyAt(dryAt), "Inline spinner")).toBe(1);
    const wet = days.find((day) => weatherForDay(day) !== "clear" && rainedYesterday(day))!;
    const wetAt = new Date(wet.getFullYear(), wet.getMonth(), wet.getDate(), 8, 30);
    expect(postFrontWaitMul(wetAt, skyAt(wetAt), "Inline spinner")).toBe(1);
  });

  it("reads yesterday's sky at its end, so a day that turned to rain counts", () => {
    const days = Array.from({ length: 365 }, (_, n) => new Date(2026, 0, 1 + n, 12));
    const turned = days.find((day) => skyTurnForDay(day)?.to === "rain")!;
    expect(rainedYesterday(new Date(turned.getFullYear(), turned.getMonth(), turned.getDate() + 1, 8))).toBe(true);
  });
});

describe("the fall turnover", () => {
  it("lasts a few days in late fall each year, slowing the bite everywhere but the inlet", () => {
    for (const year of [2026, 2027, 2028]) {
      const start = turnoverStart(year);
      expect(start.getTime()).toBeGreaterThanOrEqual(new Date(year, 9, 20).getTime());
      expect(start.getTime()).toBeLessThan(new Date(year, 9, 20 + TURNOVER_SPAN).getTime());
      const day = (n: number, hour = 10) => new Date(year, start.getMonth(), start.getDate() + n, hour);
      expect(isTurnover(day(-1))).toBe(false);
      expect(isTurnover(day(0, 0))).toBe(true);
      expect(isTurnover(day(TURNOVER_DAYS - 1, 23))).toBe(true);
      expect(isTurnover(day(TURNOVER_DAYS))).toBe(false);
      expect(turnoverWaitMul(day(1), "dock")).toBe(TURNOVER_WAIT);
      expect(turnoverWaitMul(day(1), "inlet")).toBe(TURNOVER_INLET_WAIT);
      expect(turnoverWaitMul(day(TURNOVER_DAYS), "dock")).toBe(1);
      // A season picked by hand outside fall leaves the bite as it was.
      expect(turnoverWaitMul(day(1), "dock", "spring")).toBe(1);
    }
    expect(isTurnover(new Date(2027, 6, 1))).toBe(false);
  });
});

describe("a skip cast", () => {
  it("is a cast off the dock in the bottom of the sweet band, with a lure that can skip", () => {
    const band = sweetBand(3);
    const low = band.min + (band.max - band.min) * SKIP_CAST_SHARE * 0.5;
    expect(isSkipCast(low, 3, "dock", "Nightcrawler")).toBe(true);
    expect(isSkipCast(low, 3, "dock", undefined)).toBe(true);
    expect(isSkipCast(low, 3, "reeds", "Nightcrawler")).toBe(false);
    expect(isSkipCast(low, 3, "dock", "Pencil bobbers")).toBe(false);
    expect(isSkipCast(low, 3, "dock", "Popper")).toBe(false);
    expect(isSkipCast(band.min - 0.01, 3, "dock", "Nightcrawler")).toBe(false);
    expect(isSkipCast((band.min + band.max) / 2, 3, "dock", "Nightcrawler")).toBe(false);
  });
});

describe("a dull hook", () => {
  it("shortens the solid strike to its share until touched up", () => {
    expect(solidStrikeMs(1_000, undefined, "Inline spinner", true)).toBeCloseTo(solidStrikeMs(1_000, undefined, "Inline spinner") * DULL_SOLID);
    expect(solidStrikeMs(1_000, "strong", "Twister jig", true)).toBeCloseTo(solidStrikeMs(1_000, "strong", "Twister jig") * DULL_SOLID);
  });
});

describe("a twisted line", () => {
  it("takes a turn with each spinner cast, kinks a share of casts once twisted, and spares a beginner", () => {
    expect(twistAfterCast(0, "Inline spinner")).toBe(1);
    expect(twistAfterCast(3, "Nightcrawlers")).toBe(3);
    expect(twistAfterCast(3, undefined)).toBe(3);
    expect(isTwisted(TWIST_CASTS - 1)).toBe(false);
    expect(isTwisted(TWIST_CASTS)).toBe(true);
    expect(castTangles(TWIST_CASTS - 1, 0)).toBe(false);
    expect(castTangles(TWIST_CASTS, 0)).toBe(true);
    expect(castTangles(TWIST_CASTS, TWIST_TANGLE)).toBe(false);
    expect(castTangles(TWIST_CASTS, 0, true)).toBe(false);
  });
});

describe("water warming or cooling since yesterday", () => {
  const days = Array.from({ length: 365 }, (_, n) => new Date(2026, 9, 1 + n, 12));
  const change = (day: Date) => waterTempFor(day) - waterTempFor(new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 12));

  it("wakes the fish on a day the water warms and slows them on one it cools, and leaves a steady day alone", () => {
    for (const day of days) {
      const swing = waterSwing(day);
      expect(swing, day.toDateString()).toBe(change(day) >= WATER_SWING_F ? "warming" : change(day) <= -WATER_SWING_F ? "cooling" : null);
      expect(waterSwingWaitMul(day)).toBe(swing === "warming" ? WARMING_WAIT : swing === "cooling" ? COOLING_WAIT : 1);
    }
  });

  it("comes now and then, not most days", () => {
    const warming = days.filter((day) => waterSwing(day) === "warming").length;
    const cooling = days.filter((day) => waterSwing(day) === "cooling").length;
    expect(warming).toBeGreaterThan(15);
    expect(cooling).toBeGreaterThan(15);
    expect(warming + cooling).toBeLessThan(days.length / 3);
  });
});

describe("a washed-out worm", () => {
  it("soaks with each cast on a worm, starts over on any other lure, and spares a beginner", () => {
    expect(soakAfterCast(0, "Nightcrawlers")).toBe(1);
    expect(soakAfterCast(4, "Nightcrawlers")).toBe(5);
    expect(soakAfterCast(4, "Inline spinner")).toBe(0);
    expect(soakAfterCast(4, undefined)).toBe(0);
    expect(soakAfterCast(4, "Nightcrawlers", true)).toBe(0);
    expect(isWashedOut(WORM_SOAK_CASTS - 1)).toBe(false);
    expect(isWashedOut(WORM_SOAK_CASTS)).toBe(true);
    expect(WASHED_WAIT).toBeGreaterThan(1);
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

describe("a live shiner on the hook", () => {
  const rolls = (...values: number[]) => () => values.shift() ?? 0;
  const strong = { strength: 5, accuracy: 5 };

  it("goes on the hook only from a landed golden shiner", () => {
    expect(canBaitShiner("golden-shiner")).toBe(true);
    expect(canBaitShiner("bluegill")).toBe(false);
  });

  it("draws one of the bank's hunters only on the share's roll", () => {
    expect(shinerHunter("reeds", strong, "day", rolls(LIVE_SHINER_SHARE))).toBeNull();
    for (const spot of ["dock", "reeds", "point", "dropoff", "inlet", "open"] as const) {
      const fish = shinerHunter(spot, strong, "day", rolls(0, 0.5));
      expect(fish && SHINER_HUNTERS.has(fish.id)).toBe(true);
      expect(fish?.spots).toContain(spot);
    }
  });

  it("draws only a hunter the angler could land", () => {
    // The reeds' tiger muskie needs Strength 5 and the pike 4, so a Strength 3 angler meets the largemouth.
    for (let roll = 0; roll < 1; roll += 0.1) {
      expect(shinerHunter("reeds", { strength: 3, accuracy: 5 }, "day", rolls(0, roll))?.id).toBe("largemouth-bass");
    }
    expect(shinerHunter("inlet", { strength: 1, accuracy: 1 }, "day", rolls(0, 0.5))).toBeNull();
  });

  it("draws a raider of the sunfish beds only on the share's roll, from the bank's own", () => {
    expect(bedRaider("dock", undefined, strong, "day", rolls(BED_RAIDER_SHARE))).toBeNull();
    for (let roll = 0; roll < 1; roll += 0.1) {
      const fish = bedRaider("dock", undefined, strong, "day", rolls(0, roll));
      expect(fish && BED_RAIDERS.has(fish.id)).toBe(true);
    }
    // No perch or smallmouth live off the Point, so nothing raids there.
    expect(bedRaider("point", undefined, strong, "day", rolls(0, 0.5))).toBeNull();
  });

  it("draws only a raider the angler could land", () => {
    // The smallmouth needs Strength 2, so a beginner meets the perch.
    for (let roll = 0; roll < 1; roll += 0.1) {
      expect(bedRaider("dock", undefined, { strength: 1, accuracy: 1 }, "day", rolls(0, roll))?.id).toBe("perch");
    }
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

describe("a new kind of lure at a bank fished hard", () => {
  /** Casts at the dock with each lure in turn, carrying the counts and the lures shown, and says which casts met wary fish. */
  const fish = (lures: (string | undefined)[]) => {
    let pressure = {} as ReturnType<typeof castUnderPressure>["next"];
    let shown = {} as ReturnType<typeof castNewLure>["shown"];
    return lures.map((lure) => {
      const cast = castUnderPressure(pressure, "dock");
      const switched = castNewLure(shown, cast.next, "dock", lure, cast.pressured);
      pressure = switched.pressure;
      shown = switched.shown;
      return cast.pressured && !switched.relieved;
    });
  };

  it("catches the wary fish off guard and buys the bank a few casts", () => {
    const worm = Array<string>(PRESSURE_CASTS).fill("Nightcrawlers");
    const wary = fish([...worm, "Inline spinner", ...Array<string>(NEW_LURE_RELIEF).fill("Inline spinner")]);
    expect(wary.slice(0, PRESSURE_CASTS + 1).some(Boolean)).toBe(false);
    expect(wary.slice(PRESSURE_CASTS + 1, PRESSURE_CASTS + NEW_LURE_RELIEF).some(Boolean)).toBe(false);
    expect(wary.at(-1)).toBe(true);
  });

  it("doesn't count a kind the bank already saw, so swapping back and forth is no help", () => {
    const swaps = Array.from({ length: PRESSURE_CASTS + 2 }, (_, n) => (n % 2 ? "Inline spinner" : "Nightcrawlers"));
    expect(fish(swaps).slice(PRESSURE_CASTS)).toEqual([true, true]);
    // Two spinners are the same kind of lure to the fish.
    expect(fish([...Array<string>(PRESSURE_CASTS).fill("Inline spinner"), "#5 Mepps"]).at(-1)).toBe(true);
  });

  it("forgets the lures a bank saw once it has rested fully", () => {
    const shown = castNewLure({ dock: ["worm"], reeds: ["spinner"] }, { reeds: 3 }, "point", "Nightcrawlers", false).shown;
    expect(shown).toEqual({ reeds: ["spinner"], point: ["worm"] });
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
