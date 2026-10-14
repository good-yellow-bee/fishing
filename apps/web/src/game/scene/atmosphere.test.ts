import { inLake, LAKE_HOURS, SKIES } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  FIREFLY_COUNT,
  FIREFLY_HIGH,
  FIREFLY_HOME_RADIUS,
  FIREFLY_LOW,
  FIREFLY_WANDER,
  REED_BEDS,
  firefliesOut,
  firefly,
} from "./fireflies.ts";
import { MIST_CLEAR_FAR, MIST_CLEAR_NEAR, MIST_COUNT, MIST_DRIFT, MIST_LAYERS, mistAmount, mistNearFade, mistPuff } from "./mist.ts";

const TIMES = [0, 1.7, 13.3, 61, 250.5, 1200];

describe("fireflies", () => {
  it("only come out on dry nights", () => {
    for (const hour of LAKE_HOURS) {
      for (const sky of SKIES) {
        expect(firefliesOut(hour, sky)).toBe(hour === "night" && sky !== "rain");
      }
    }
  });

  it("stay over a reed bed, between the reed tops and head height", () => {
    expect(FIREFLY_COUNT).toBe(REED_BEDS.reduce((sum, bed) => sum + bed.flies, 0));
    const reach = FIREFLY_HOME_RADIUS + FIREFLY_WANDER * Math.SQRT2 + 1e-6;
    for (let i = 0; i < FIREFLY_COUNT; i += 1) {
      for (const time of TIMES) {
        const fly = firefly(i, time);
        const nearest = Math.min(...REED_BEDS.map((bed) => Math.hypot(fly.x - bed.x, fly.z - bed.z)));
        expect(nearest).toBeLessThanOrEqual(reach);
        expect(fly.y).toBeGreaterThanOrEqual(FIREFLY_LOW);
        expect(fly.y).toBeLessThanOrEqual(FIREFLY_HIGH);
        expect(fly.glow).toBeGreaterThan(0);
        expect(fly.glow).toBeLessThanOrEqual(1);
      }
    }
  });

  it("blink: each one flashes bright and spends most of its time dim", () => {
    for (let i = 0; i < FIREFLY_COUNT; i += 1) {
      const glows = Array.from({ length: 500 }, (_, k) => firefly(i, k * 0.01 * 5).glow);
      expect(Math.max(...glows)).toBeGreaterThan(0.8);
      expect(glows.filter((g) => g < 0.3).length).toBeGreaterThan(glows.length / 2);
    }
  });

  it("hold still for reduced motion but keep blinking", () => {
    const a = firefly(3, 0, true);
    const b = firefly(3, 40.7, true);
    expect([b.x, b.y, b.z]).toEqual([a.x, a.y, a.z]);
    expect(b.glow).not.toBe(a.glow);
  });
});

describe("mist", () => {
  it("lies at dawn and in fog, and never in rain", () => {
    for (const hour of LAKE_HOURS) {
      for (const sky of SKIES) {
        const amount = mistAmount(hour, sky);
        if (sky === "rain") expect(amount).toBe(0);
        else if (sky === "fog" || hour === "dawn") expect(amount).toBeGreaterThan(0.15);
        else expect(amount).toBe(0);
        // Thin enough that fish shadows still show through.
        expect(amount).toBeLessThanOrEqual(0.45);
      }
    }
    expect(mistAmount("dawn", "fog")).toBeGreaterThan(mistAmount("dawn", "clear"));
  });

  it("covers the basin in two sheets, every puff over water wherever it drifts", () => {
    expect(MIST_COUNT).toBeGreaterThan(20);
    const heights = new Set<number>();
    for (let i = 0; i < MIST_COUNT; i += 1) {
      for (const time of [...TIMES, 34.9, 70]) {
        const puff = mistPuff(i, time);
        expect(inLake(puff.x, puff.z)).toBe(true);
        heights.add(puff.y);
      }
    }
    expect([...heights].sort()).toEqual([...MIST_LAYERS]);
  });

  it("drifts slowly, and not at all for reduced motion", () => {
    const a = mistPuff(5, 10);
    const b = mistPuff(5, 11);
    const step = Math.hypot(b.x - a.x, b.z - a.z);
    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(MIST_DRIFT * 0.1);
    expect(mistPuff(5, 99, true)).toEqual(mistPuff(5, 0, true));
  });

  it("clears around the camera and is whole past the clear radius", () => {
    expect(mistNearFade(0, 0)).toBe(0);
    expect(mistNearFade(MIST_CLEAR_NEAR, 0)).toBe(0);
    expect(mistNearFade(0, MIST_CLEAR_FAR)).toBe(1);
    expect(mistNearFade(30, 30)).toBe(1);
    const mid = mistNearFade((MIST_CLEAR_NEAR + MIST_CLEAR_FAR) / 2, 0);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
  });
});
