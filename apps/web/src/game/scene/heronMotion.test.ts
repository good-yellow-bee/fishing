import { inLake, LAKE_HOURS, SKIES } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  HERON_AWAY_SEC,
  HERON_BEAT,
  HERON_FLEE_RADIUS,
  HERON_FLIGHT_SEC,
  heronFlight,
  heronLanding,
  heronOut,
  heronWade,
  stepHeron,
  type HeronState,
} from "./heronMotion";

const FAR = { x: 20, z: 20 };

describe("heron", () => {
  it("is out by day and stays in at night and in rain", () => {
    for (const hour of LAKE_HOURS) {
      for (const sky of SKIES) expect(heronOut(hour, sky)).toBe(hour !== "night" && sky !== "rain");
    }
  });

  it("wades only along its beat, in the water, and stabs now and then", () => {
    let stabs = 0;
    for (let t = 0; t < 140; t += 0.05) {
      const pose = heronWade(t);
      expect(inLake(pose.x, pose.z)).toBe(true);
      const lo = Math.min(HERON_BEAT.a.x, HERON_BEAT.b.x) - 1e-6;
      const hi = Math.max(HERON_BEAT.a.x, HERON_BEAT.b.x) + 1e-6;
      expect(pose.x).toBeGreaterThanOrEqual(lo);
      expect(pose.x).toBeLessThanOrEqual(hi);
      expect(pose.flying).toBe(false);
      if (pose.stab > 0.9) stabs += 1;
    }
    expect(stabs).toBeGreaterThan(0);
  });

  it("stands still for reduced motion", () => {
    expect(heronWade(3, true)).toEqual(heronWade(77, true));
  });

  it("flies off when the angler comes close, stays away, and glides back once they have gone", () => {
    let state: HeronState = { mode: "wading" };
    const wading = heronWade(10);
    state = stepHeron(state, 10, FAR, wading);
    expect(state.mode).toBe("wading");
    const near = { x: wading.x + HERON_FLEE_RADIUS - 1, z: wading.z };
    state = stepHeron(state, 10, near, wading);
    expect(state.mode).toBe("flying");
    state = stepHeron(state, 10 + HERON_FLIGHT_SEC, near, wading);
    expect(state.mode).toBe("away");
    // Still close: it waits even after the away time.
    state = stepHeron(state, 10 + HERON_FLIGHT_SEC + HERON_AWAY_SEC + 5, near, wading);
    expect(state.mode).toBe("away");
    const back = 10 + HERON_FLIGHT_SEC + HERON_AWAY_SEC + 6;
    state = stepHeron(state, back, FAR, wading);
    expect(state.mode).toBe("landing");
    state = stepHeron(state, back + HERON_FLIGHT_SEC, FAR, wading);
    expect(state.mode).toBe("wading");
  });

  it("turns round in the air if spooked while gliding in, without jumping", () => {
    const wading = heronWade(0);
    const since = 100;
    const age = 3;
    const landingPose = heronLanding(age, wading)!;
    const state = stepHeron({ mode: "landing", since }, since + age, { x: wading.x, z: wading.z }, wading);
    expect(state.mode).toBe("flying");
    if (state.mode !== "flying") return;
    const flyingPose = heronFlight(since + age - state.since, state.from)!;
    expect(flyingPose.x).toBeCloseTo(landingPose.x, 6);
    expect(flyingPose.y).toBeCloseTo(landingPose.y, 6);
    expect(flyingPose.z).toBeCloseTo(landingPose.z, 6);
  });

  it("climbs away from the reeds and is gone after the flight", () => {
    const from = HERON_BEAT.a;
    const early = heronFlight(0.5, from)!;
    const late = heronFlight(HERON_FLIGHT_SEC - 0.1, from)!;
    expect(late.y).toBeGreaterThan(early.y);
    expect(Math.hypot(late.x - from.x, late.z - from.z)).toBeGreaterThan(20);
    expect(heronFlight(HERON_FLIGHT_SEC, from)).toBeNull();
    expect(early.flying).toBe(true);
  });
});
