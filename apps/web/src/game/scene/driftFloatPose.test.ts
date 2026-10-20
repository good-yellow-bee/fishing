import { describe, expect, it } from "vitest";
import { inLake, spotAt, walkableAt, type SpotId } from "@stillwater/shared";
import { DIP, driftFloatPose, driftTurn, LOOP_R, lostFloatAt, REST_TILT } from "./driftFloatPose";
import { giantWaterAt } from "./giantWake";

const BANKS: SpotId[] = ["dock", "point", "reeds", "dropoff", "inlet"];

describe("lost float home", () => {
  it("drifts on its own bank's open water all round its ring, clear of where the giant swirls", () => {
    for (const bank of BANKS) {
      const home = lostFloatAt(bank)!;
      for (let step = 0; step < 16; step += 1) {
        const angle = (step / 16) * 2 * Math.PI;
        const x = home.x + LOOP_R * Math.cos(angle);
        const z = home.z + LOOP_R * Math.sin(angle);
        expect(inLake(x, z), bank).toBe(true);
        expect(spotAt(x, z), bank).toBe(bank);
        expect(walkableAt(x, z), bank).toBe(false);
      }
      const giant = giantWaterAt(bank)!;
      expect(Math.hypot(home.x - giant.x, home.z - giant.z) - LOOP_R, bank).toBeGreaterThan(1);
    }
  });

  it("has none on open water, and each bank keeps its own beat", () => {
    expect(lostFloatAt("open")).toBeNull();
    expect(new Set(BANKS.map(driftTurn)).size).toBe(BANKS.length);
  });
});

describe("driftFloatPose", () => {
  it("holds still under reduced motion", () => {
    expect(driftFloatPose(37.2, 2, true)).toEqual(driftFloatPose(0, 2, true));
    expect(driftFloatPose(37.2, 2, true)).toMatchObject({ sink: 0, tilt: REST_TILT });
  });

  it("moves without jumps, stays on its ring and never sinks deeper than a dip", () => {
    let last = driftFloatPose(0, 1, false);
    let moved = 0;
    let dipped = false;
    let towed = false;
    for (let time = 0.05; time < 60; time += 0.05) {
      const pose = driftFloatPose(time, 1, false);
      const step = Math.hypot(pose.x - last.x, pose.z - last.z);
      expect(step).toBeLessThan(0.05);
      expect(Math.abs(pose.sink - last.sink)).toBeLessThan(0.05);
      expect(Math.hypot(pose.x, pose.z)).toBeCloseTo(LOOP_R);
      expect(pose.sink).toBeGreaterThanOrEqual(0);
      expect(pose.sink).toBeLessThanOrEqual(DIP);
      moved += step;
      dipped ||= pose.sink > DIP / 2;
      towed ||= pose.tilt > REST_TILT + 0.2;
      last = pose;
    }
    expect(moved).toBeGreaterThan(LOOP_R * 2);
    expect(dipped).toBe(true);
    expect(towed).toBe(true);
  });

  it("leans along its path while towed", () => {
    // Midway through a slide: the step it takes runs along the yaw's +z.
    const a = driftFloatPose(0.79, 0, false);
    const b = driftFloatPose(0.81, 0, false);
    const heading = Math.atan2(b.x - a.x, b.z - a.z);
    expect(Math.cos(heading - a.yaw)).toBeGreaterThan(0.99);
  });
});
