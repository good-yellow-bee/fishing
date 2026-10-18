import { describe, expect, it } from "vitest";
import { CLIMB_SEC, PLUNGE_SEC, TERN_COUNT, TERN_CYCLE, TERN_HEIGHT, TERN_RADIUS, TERN_STILL_TIME, ternPose, ternsOut } from "./ternHover";

const PATCH = { x: 2, z: -3 };

describe("terns", () => {
  it("are out by day in spring and summer, not in rain", () => {
    expect(ternsOut("day", "clear", "summer")).toBe(true);
    expect(ternsOut("dawn", "overcast", "spring")).toBe(true);
    expect(ternsOut("night", "clear", "summer")).toBe(false);
    expect(ternsOut("day", "rain", "summer")).toBe(false);
    expect(ternsOut("day", "clear", "fall")).toBe(false);
  });

  it("stay over the fish patch, a couple of meters up", () => {
    for (let time = 0; time < TERN_CYCLE * 3; time += 0.1) {
      for (let k = 0; k < TERN_COUNT; k += 1) {
        const pose = ternPose(k, time, PATCH);
        expect(Math.hypot(pose.x - PATCH.x, pose.z - PATCH.z)).toBeLessThan(TERN_RADIUS * 1.1);
        expect(pose.y).toBeGreaterThan(0);
        expect(pose.y).toBeLessThan(TERN_HEIGHT + 0.3);
      }
    }
  });

  it("each plunges to the water once a round and climbs back", () => {
    const plungeAt = TERN_CYCLE - PLUNGE_SEC - CLIMB_SEC;
    const low = ternPose(0, plungeAt + PLUNGE_SEC, PATCH);
    expect(low.y).toBeLessThan(0.2);
    expect(low.splash).toBeCloseTo(0, 5);
    expect(ternPose(0, plungeAt - 1, PATCH).splash).toBe(-1);
    expect(ternPose(0, TERN_CYCLE - 0.01, PATCH).y).toBeGreaterThan(TERN_HEIGHT - 0.4);
  });

  it("take turns: no two plunge at once", () => {
    for (let time = 0; time < TERN_CYCLE * 2; time += 0.05) {
      const low = Array.from({ length: TERN_COUNT }, (_, k) => ternPose(k, time, PATCH)).filter((pose) => pose.y < 1);
      expect(low.length).toBeLessThanOrEqual(1);
    }
  });

  it("hang up over the patch at the moment reduced motion holds them, none plunging or over a splash", () => {
    for (let k = 0; k < TERN_COUNT; k += 1) {
      const pose = ternPose(k, TERN_STILL_TIME, PATCH);
      expect(pose.diving).toBe(false);
      expect(pose.splash).toBe(-1);
      expect(pose.y).toBeGreaterThan(TERN_HEIGHT - 0.4);
    }
  });
});
