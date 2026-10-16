import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { castIntoSchool, hookWindowMs, isPerfectCast, isSolidStrike, SCHOOL_CASTS, SCHOOL_SAME, SCHOOL_WAIT, SCHOOLERS, schoolAfterLanding, solidStrikeMs, WIND_STRIKE, perfectCastBand, PERFECT_CAST_WAIT, sweetBand, waitMs } from "./logic";

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
    for (const id of SCHOOLERS) expect(FISH.some((fish) => fish.id === id && fish.rarity === "common")).toBe(true);
    expect(SCHOOL_SAME).toBeGreaterThan(0);
    expect(SCHOOL_WAIT).toBeLessThan(1);
  });
});
