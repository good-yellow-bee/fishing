import { describe, expect, it } from "vitest";
import { OSPREY_CYCLE_SEC, OSPREY_START_SEC, ospreyAt, ospreyHunt, ospreyOut, ospreyStrikeAt } from "./ospreyFlight";

describe("osprey", () => {
  it("hunts on fine days outside winter", () => {
    expect(ospreyOut("day", "clear", "summer")).toBe(true);
    expect(ospreyOut("day", "rain", "summer")).toBe(false);
    expect(ospreyOut("day", "clear", "winter")).toBe(false);
    expect(ospreyOut("dusk", "clear", "summer")).toBe(false);
  });

  it("is away between hunts", () => {
    expect(ospreyAt(OSPREY_START_SEC - 1)).toBeNull();
    expect(ospreyAt(OSPREY_CYCLE_SEC - 1)).toBeNull();
    expect(ospreyAt(OSPREY_START_SEC + 1)).not.toBeNull();
  });

  it("circles low enough to see, then plunges into the water at its spot", () => {
    const strike = ospreyStrikeAt(0);
    const circling = ospreyAt(OSPREY_START_SEC + 15)!;
    expect(circling.y).toBeGreaterThan(3);
    expect(circling.y).toBeLessThan(5);
    expect(circling.flapping).toBe(false);
    const falling = ospreyAt(strike - 0.3)!;
    expect(falling.pitch).toBeLessThan(-1);
    expect(falling.spread).toBeLessThan(0.5);
    const hit = ospreyAt(strike + 0.1)!;
    const { dive } = ospreyHunt(0);
    expect(hit.y).toBe(0);
    expect(hit.x).toBeCloseTo(dive.x, 6);
    expect(hit.ring).toBeGreaterThanOrEqual(0);
  });

  it("climbs away flapping, higher and higher", () => {
    const strike = ospreyStrikeAt(0);
    const a = ospreyAt(strike + 1.5)!;
    const b = ospreyAt(strike + 5)!;
    expect(a.flapping).toBe(true);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it("sometimes carries a fish off, and not every time", () => {
    const strikes = Array.from({ length: 20 }, (_, slot) => ospreyAt(ospreyStrikeAt(slot) + 2)!.fish);
    expect(strikes.some(Boolean)).toBe(true);
    expect(strikes.every(Boolean)).toBe(false);
  });
});
