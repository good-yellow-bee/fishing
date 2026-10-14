import { describe, expect, it } from "vitest";
import { FISH } from "./fish.ts";
import { biteMoonMul, FULL_MOON_LIFT, moonFromSearch, moonLight, moonName, moonPhase, moonSpan, SYNODIC_DAYS } from "./moon.ts";

const rare = FISH.find((fish) => fish.rarity === "rare")!;
const common = FISH.find((fish) => fish.rarity === "common")!;

describe("the real moon", () => {
  it("reads known phases off the calendar", () => {
    // Full moon 7 Sep 2025 18:09 UTC; new moon 21 Sep 2025 19:54 UTC.
    expect(moonName(moonPhase(new Date(Date.UTC(2025, 8, 7, 18))))).toBe("full");
    expect(moonName(moonPhase(new Date(Date.UTC(2025, 8, 21, 20))))).toBe("new");
    expect(moonLight(moonPhase(new Date(Date.UTC(2025, 8, 7, 18))))).toBeGreaterThan(0.98);
  });

  it("runs once around a month and stays in 0..1, before 2000 too", () => {
    const start = new Date(Date.UTC(2026, 9, 14));
    const later = new Date(start.getTime() + SYNODIC_DAYS * 86_400_000);
    expect(moonPhase(later)).toBeCloseTo(moonPhase(start), 6);
    const old = moonPhase(new Date(Date.UTC(1990, 0, 1)));
    expect(old).toBeGreaterThanOrEqual(0);
    expect(old).toBeLessThan(1);
  });

  it("names the quarters and the crescents and gibbous between them", () => {
    expect(moonName(0.25)).toBe("first-quarter");
    expect(moonName(0.1)).toBe("waxing-crescent");
    expect(moonName(0.4)).toBe("waxing-gibbous");
    expect(moonName(0.6)).toBe("waning-gibbous");
    expect(moonName(0.75)).toBe("last-quarter");
    expect(moonName(0.9)).toBe("waning-crescent");
    expect(moonName(0.99)).toBe("new");
  });

  it("lights the right side waxing, the whole disc at full, the left side waning", () => {
    expect(moonSpan(0, 0)[1] - moonSpan(0, 0)[0]).toBeCloseTo(0);
    expect(moonSpan(0.25, 0)).toEqual([expect.closeTo(0), 1]);
    expect(moonSpan(0.5, 0)).toEqual([expect.closeTo(-1), 1]);
    expect(moonSpan(0.75, 0)).toEqual([-1, expect.closeTo(0)]);
    const [left, right] = moonSpan(0.5, 0.8);
    expect(right - left).toBeCloseTo(1.2);
  });

  it("pins a phase from ?moon= and ignores anything else", () => {
    expect(moonFromSearch("?moon=0.5")).toBe(0.5);
    expect(moonFromSearch("moon=0")).toBe(0);
    expect(moonFromSearch("?moon=")).toBeNull();
    expect(moonFromSearch("?moon=2")).toBeNull();
    expect(moonFromSearch("?sky=rain")).toBeNull();
  });

  it("lifts rare fish a little on a bright night only", () => {
    expect(biteMoonMul(rare, "night", 1)).toBeCloseTo(1 + FULL_MOON_LIFT);
    expect(biteMoonMul(rare, "night", 0.5)).toBe(1);
    expect(biteMoonMul(rare, "dusk", 1)).toBe(1);
    expect(biteMoonMul(common, "night", 1)).toBe(1);
  });
});
