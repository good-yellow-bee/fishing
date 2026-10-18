import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { canoeRoute } from "./canoeTrip";
import { LEG_SEC, SAIL_FROM, SAIL_TO, TACK_SEC, sailAt, sailingOut } from "./sailingTrip";

const BREEZY = { x: 0.05, z: -0.06 };

describe("sailing dinghy", () => {
  it("goes out by day from spring to fall when there is a breeze to sail in", () => {
    expect(sailingOut("day", "clear", "summer", BREEZY)).toBe(true);
    expect(sailingOut("day", "overcast", "fall", BREEZY)).toBe(true);
    expect(sailingOut("day", "clear", "summer", { x: 0, z: 0.01 })).toBe(false);
    expect(sailingOut("day", "rain", "summer", BREEZY)).toBe(false);
    expect(sailingOut("day", "fog", "summer", BREEZY)).toBe(false);
    expect(sailingOut("day", "clear", "winter", BREEZY)).toBe(false);
    expect(sailingOut("dusk", "clear", "summer", BREEZY)).toBe(false);
  });

  it("keeps to open water, well clear of the canoe's far-shore route", () => {
    for (let t = 0; t < 2 * (LEG_SEC + TACK_SEC); t += 0.5) {
      const pose = sailAt(t, BREEZY);
      expect(inLake(pose.x, pose.z)).toBe(true);
      for (let u = 0; u <= 1; u += 0.05) {
        const canoe = canoeRoute(u);
        expect(Math.hypot(pose.x - canoe.x, pose.z - canoe.z)).toBeGreaterThan(3);
      }
    }
  });

  it("runs between its two marks and back, without jumps", () => {
    expect(sailAt(0, BREEZY)).toMatchObject({ x: SAIL_FROM.x, z: SAIL_FROM.z });
    expect(sailAt(LEG_SEC + 1, BREEZY)).toMatchObject({ x: SAIL_TO.x, z: SAIL_TO.z });
    let last = sailAt(0, BREEZY);
    for (let t = 0.05; t < 2 * (LEG_SEC + TACK_SEC); t += 0.05) {
      const pose = sailAt(t, BREEZY);
      expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThan(0.1);
      expect(Math.abs(pose.heel - last.heel)).toBeLessThan(0.1);
      last = pose;
    }
  });

  it("heels and swings its boom to the lee side, further in a stronger breeze", () => {
    const pose = sailAt(10, { x: 0.13, z: 0 }, true);
    // Sailing north-east-ish with the wind blowing east, the lee side is the boat's starboard (+x).
    const across = Math.cos(pose.yaw) * 0.13;
    expect(Math.sign(pose.heel)).toBe(-Math.sign(across));
    expect(Math.sign(pose.boom)).toBe(-Math.sign(across));
    expect(Math.abs(sailAt(10, { x: 0.13, z: 0 }, true).heel)).toBeGreaterThan(Math.abs(sailAt(10, { x: 0.04, z: 0 }, true).heel));
  });

  it("comes upright as it goes about", () => {
    const mid = sailAt(LEG_SEC + TACK_SEC / 2, BREEZY);
    expect(Math.abs(mid.heel)).toBeLessThan(0.05);
  });

  it("holds still for reduced motion", () => {
    expect(sailAt(3, BREEZY, true)).toEqual(sailAt(60, BREEZY, true));
  });
});

describe("sailing dinghy's run", () => {
  it("stays clear of the open-water fishing spot", async () => {
    const { OPEN_PAD } = await import("@stillwater/shared");
    for (let t = 0; t < 2 * (LEG_SEC + TACK_SEC); t += 0.5) {
      const pose = sailAt(t, BREEZY);
      expect(Math.hypot(pose.x - OPEN_PAD.x, pose.z - OPEN_PAD.z)).toBeGreaterThan(2.5);
    }
  });
});
