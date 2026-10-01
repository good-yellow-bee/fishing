import { inLake } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  WAIT_EASE_SEC,
  WAIT_REST_SAG,
  WAIT_ROD,
  WAIT_TIGHT_SEC,
  WAIT_TWITCH_AT,
  applyWaitShift,
  lureIsWaiting,
  waitBodyLean,
  waitDrift,
  waitLineSag,
  waitNod,
  waitRodPitch,
  waitTwitchActive,
  waitTwitchEnd,
  waitTwitchPull,
} from "./waitMotion.ts";

describe("waiting lure", () => {
  it("drifts and nods with the chop, and sits still off the water", () => {
    const x = 0;
    const z = -6;
    const early = waitDrift(x, z, 0.4);
    const later = waitDrift(x, z, 2.3);
    expect(Math.hypot(early.x, early.z)).toBeLessThan(0.28);
    expect(Math.hypot(later.x - early.x, later.z - early.z)).toBeGreaterThan(0.02);
    const nodEarly = waitNod(x, z, 0.4);
    const nodLater = waitNod(x, z, 2.3);
    expect(Math.abs(nodEarly.x)).toBeLessThanOrEqual(0.26);
    expect(Math.abs(nodEarly.z)).toBeLessThanOrEqual(0.26);
    expect(Math.hypot(nodLater.x - nodEarly.x, nodLater.z - nodEarly.z)).toBeGreaterThan(0.01);
    expect(waitDrift(0, 40, 1.2)).toEqual({ x: 0, z: 0 });
    expect(waitNod(0, 40, 1.2)).toEqual({ x: 0, z: 0 });
  });

  it("gives one twitch that eases the line, then tightens it", () => {
    expect(waitRodPitch(0)).toBeCloseTo(WAIT_ROD);
    expect(waitLineSag(-1)).toBeCloseTo(WAIT_REST_SAG);
    expect(waitTwitchPull(0)).toBe(0);
    expect(waitBodyLean(0.1)).toBe(0);
    expect(waitTwitchActive(WAIT_TWITCH_AT - 0.01)).toBe(false);

    const eased = WAIT_TWITCH_AT + WAIT_EASE_SEC;
    expect(waitLineSag(eased)).toBeGreaterThan(WAIT_REST_SAG + 0.25);
    expect(waitRodPitch(eased)).toBeGreaterThan(WAIT_ROD + 0.1);
    expect(waitBodyLean(eased)).toBeGreaterThan(0.05);
    expect(waitTwitchPull(eased)).toBe(0);

    const tight = WAIT_TWITCH_AT + WAIT_EASE_SEC + WAIT_TIGHT_SEC;
    expect(waitLineSag(tight)).toBeLessThan(0.08);
    expect(waitLineSag(tight)).toBeLessThan(WAIT_REST_SAG - 0.1);
    expect(waitRodPitch(tight)).toBeLessThan(WAIT_ROD - 0.12);
    expect(waitBodyLean(tight)).toBeLessThan(0);
    expect(waitTwitchPull(tight)).toBeGreaterThan(0.1);

    const done = waitTwitchEnd();
    expect(waitTwitchActive(done - 0.01)).toBe(true);
    expect(waitTwitchActive(done)).toBe(false);
    expect(waitRodPitch(done)).toBeCloseTo(WAIT_ROD);
    expect(waitLineSag(done + 4)).toBeCloseTo(WAIT_REST_SAG);
    expect(waitTwitchPull(done + 2)).toBe(0);
    expect(waitBodyLean(done + 2)).toBe(0);

    let tightenings = 0;
    let slack = false;
    for (let i = 0; i <= 1000; i += 1) {
      const sag = waitLineSag(i * 0.01);
      if (!slack && sag > WAIT_REST_SAG + 0.2) slack = true;
      if (slack && sag < 0.08) {
        tightenings += 1;
        slack = false;
      }
    }
    expect(tightenings).toBe(1);
  });

  it("draws the bobber in only while the line tightens", () => {
    const time = 1.4;
    const resting = applyWaitShift(0, -6, 5, 8, time, 0);
    const eased = applyWaitShift(0, -6, 5, 8, time, WAIT_TWITCH_AT + WAIT_EASE_SEC);
    const tight = applyWaitShift(0, -6, 5, 8, time, WAIT_TWITCH_AT + WAIT_EASE_SEC + WAIT_TIGHT_SEC);
    const restReach = Math.hypot(resting.x - 5, resting.z - 8);
    expect(Math.hypot(eased.x - resting.x, eased.z - resting.z)).toBeCloseTo(0);
    expect(Math.hypot(tight.x - 5, tight.z - 8)).toBeLessThan(restReach - 0.08);
  });

  it("keeps the twitch in the lake and off the dock", () => {
    const x = 0;
    const z = 5.18;
    const age = WAIT_TWITCH_AT + WAIT_EASE_SEC + WAIT_TIGHT_SEC;
    let rawOnDeck = false;
    for (let i = 0; i < 48; i += 1) {
      const time = i * 0.37;
      const shifted = applyWaitShift(x, z, 0, 8, time, age);
      const onDeck = shifted.x >= -1.05 && shifted.x <= 1.05 && shifted.z >= 5.2 && shifted.z <= 8.5;
      expect(onDeck).toBe(false);
      expect(inLake(shifted.x, shifted.z)).toBe(true);
      const drift = waitDrift(x, z, time);
      const pull = waitTwitchPull(age);
      let rawX = x + drift.x;
      let rawZ = z + drift.z;
      const dx = 0 - rawX;
      const dz = 8 - rawZ;
      const reach = Math.hypot(dx, dz) || 1;
      rawX += (dx / reach) * pull;
      rawZ += (dz / reach) * pull;
      if (rawX >= -1.05 && rawX <= 1.05 && rawZ >= 5.2 && rawZ <= 8.5) rawOnDeck = true;
      const edge = applyWaitShift(0, -16.35, 0, 0, time, 0);
      expect(inLake(edge.x, edge.z)).toBe(true);
    }
    expect(rawOnDeck).toBe(true);
  });

  it("stays off through the cast flight, the bite, the miss, the fight, and the landing", () => {
    expect(lureIsWaiting("waiting", true)).toBe(false);
    expect(lureIsWaiting("waiting", false)).toBe(true);
    for (const phase of ["idle", "casting", "hookset", "fight", "result"] as const) {
      expect(lureIsWaiting(phase, false)).toBe(false);
      expect(lureIsWaiting(phase, true)).toBe(false);
    }
  });
});
