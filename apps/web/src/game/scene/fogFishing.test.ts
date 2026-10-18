import { describe, expect, it } from "vitest";
import { inLake, OPEN_PAD } from "@stillwater/shared";
import { ANCHORED_AT, CAST_ROUND_SEC, anglerAt, boatYaw, floatSpot, fogAnglerOut } from "./fogFishing";

describe("fog angler", () => {
  it("is out only in fog, and not at night", () => {
    expect(fogAnglerOut("dawn", "fog")).toBe(true);
    expect(fogAnglerOut("day", "fog")).toBe(true);
    expect(fogAnglerOut("dusk", "fog")).toBe(true);
    expect(fogAnglerOut("night", "fog")).toBe(false);
    expect(fogAnglerOut("day", "clear")).toBe(false);
    expect(fogAnglerOut("day", "rain")).toBe(false);
  });

  it("lands every cast out on the water, clear of the open-water anchorage and the moored boats", () => {
    for (let n = 0; n < 60; n += 1) {
      const spot = floatSpot(n);
      expect(inLake(spot.x, spot.z)).toBe(true);
      expect(Math.hypot(spot.x - OPEN_PAD.x, spot.z - OPEN_PAD.z)).toBeGreaterThan(6);
      expect(Math.hypot(spot.x + 8.5, spot.z + 5)).toBeGreaterThan(2.5);
      expect(Math.hypot(spot.x - ANCHORED_AT.x, spot.z - ANCHORED_AT.z)).toBeGreaterThan(3);
    }
  });

  it("keeps the boat swinging gently about its heading", () => {
    for (let t = 0; t < 300; t += 3.7) expect(Math.abs(boatYaw(t) - boatYaw(0, true))).toBeLessThan(0.3);
  });

  it("waits with the float out most of the time, then reels in and casts", () => {
    let waiting = 0;
    let hanging = 0;
    for (let t = 0; t < CAST_ROUND_SEC * 4; t += 0.1) {
      const pose = anglerAt(t);
      if (pose.float && pose.float.y === 0 && pose.rod < 0.6) waiting += 1;
      if (!pose.float) hanging += 1;
      if (pose.float) expect(pose.float.y).toBeGreaterThanOrEqual(0);
    }
    const frames = (CAST_ROUND_SEC * 4) / 0.1;
    expect(waiting / frames).toBeGreaterThan(0.7);
    expect(hanging).toBeGreaterThan(0);
  });

  it("swings the rod back over the shoulder during the cast", () => {
    const back = Math.max(...Array.from({ length: 100 }, (_, i) => anglerAt(CAST_ROUND_SEC - 1.4 + i * 0.014).rod));
    expect(back).toBeGreaterThan(Math.PI / 2);
  });

  it("holds still with the float out when motion is reduced", () => {
    expect(anglerAt(5, true)).toEqual(anglerAt(500, true));
    expect(anglerAt(5, true).float).not.toBeNull();
    expect(boatYaw(40, true)).toBe(boatYaw(0, true));
  });
});
