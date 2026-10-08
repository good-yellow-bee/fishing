import { DOCK_PAD, DROPOFF_PAD, inLake, LAKE_RX, onDockPlanks, POINT_PAD, REEDS_PAD, resolveCast, walkableAt } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { waterHeight } from "./water.ts";
import {
  RAIN_COUNT,
  RAIN_FALL_SEC,
  RAIN_RIPPLE_LIFT,
  RAIN_RIPPLE_SEC,
  RAIN_SKY_TOP,
  rainColumn,
  rainRipple,
  rainStreak,
} from "./skyWeather.ts";

const CYCLE = RAIN_FALL_SEC + RAIN_RIPPLE_SEC;

function fallStart(index: number) {
  const phase = rainColumn(index).phase;
  return ((1 - phase) % 1) * CYCLE;
}

describe("lake rain", () => {
  it("keeps every drop over open water, off the dock", () => {
    const places = new Set<string>();
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      const drop = rainColumn(i);
      expect(inLake(drop.x, drop.z)).toBe(true);
      expect(onDockPlanks(drop.x, drop.z)).toBe(false);
      expect(walkableAt(drop.x, drop.z)).toBe(false);
      places.add(`${drop.x.toFixed(2)},${drop.z.toFixed(2)}`);
    }
    expect(places.size).toBe(RAIN_COUNT);
  });

  it("rains around the bobber at every bank, not only in front of the dock", () => {
    const drops = Array.from({ length: RAIN_COUNT }, (_, i) => rainColumn(i));
    for (const [bank, pad] of [["dock", DOCK_PAD], ["reeds", REEDS_PAD], ["dropoff", DROPOFF_PAD], ["point", POINT_PAD]] as const) {
      let landings = 0;
      for (let x = -LAKE_RX; x <= LAKE_RX; x += 0.5) {
        for (let z = -18; z <= 14; z += 0.5) {
          if (!resolveCast(x, z, bank, 99, pad.x, pad.z).ok) continue;
          landings += 1;
          const nearest = Math.min(...drops.map((drop) => Math.hypot(drop.x - x, drop.z - z)));
          expect(nearest, `${bank} ${x},${z}`).toBeLessThan(2.5);
        }
      }
      expect(landings, bank).toBeGreaterThan(20);
    }
  });

  it("fills the sky and the water at the same time", () => {
    let sky = 0;
    let water = 0;
    const time = 2.4;
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      const streak = rainStreak(i, time);
      const ripple = rainRipple(i, time);
      expect(Boolean(streak && ripple)).toBe(false);
      if (streak) {
        sky += 1;
        const head = streak.y + streak.length / 2;
        expect(head).toBeGreaterThan(0);
        expect(head).toBeLessThanOrEqual(RAIN_SKY_TOP + 1e-6);
      }
      if (ripple) {
        water += 1;
        expect(ripple.y).toBeCloseTo(waterHeight(ripple.x, ripple.z, time) + RAIN_RIPPLE_LIFT, 5);
        expect(ripple.radius).toBeGreaterThan(0.1);
        expect(ripple.open).toBeGreaterThanOrEqual(0);
        expect(ripple.open).toBeLessThan(1);
      }
    }
    expect(sky).toBeGreaterThan(RAIN_COUNT * 0.45);
    expect(water).toBeGreaterThan(RAIN_COUNT * 0.25);
  });

  it("drops a streak through the sky until it rings that spot", () => {
    const index = 4;
    const column = rainColumn(index);
    const start = fallStart(index);
    const high = rainStreak(index, start + 0.04);
    const low = rainStreak(index, start + 0.55);
    expect(high).not.toBeNull();
    expect(low).not.toBeNull();
    expect(high!.y).toBeGreaterThan(RAIN_SKY_TOP * 0.55);
    expect(low!.y).toBeLessThan(high!.y - 4);
    expect(high!.x).toBe(column.x);
    expect(low!.z).toBe(column.z);

    const hit = start + RAIN_FALL_SEC + 0.08;
    expect(rainStreak(index, hit)).toBeNull();
    const ripple = rainRipple(index, hit);
    const later = rainRipple(index, hit + 0.35);
    expect(ripple).not.toBeNull();
    expect(later).not.toBeNull();
    expect(ripple!.x).toBe(column.x);
    expect(ripple!.z).toBe(column.z);
    expect(later!.radius).toBeGreaterThan(ripple!.radius + 0.25);
    expect(later!.open).toBeGreaterThan(ripple!.open);
  });
});
