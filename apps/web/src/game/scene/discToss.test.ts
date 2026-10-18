import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { FLIGHT_SEC, HAND_Y, PLAYERS, TOSS_ROUND_SEC, discAt, discOut, tosserAt } from "./discToss";
import { walkPath } from "./dogWalk";
import { kiteFlyer } from "./kiteFlight";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("disc tossers on the far bank", () => {
  it("come out by day in summer when it is dry, clear of fog and not too windy", () => {
    const light = { x: 0.04, z: 0 };
    expect(discOut("day", "clear", "summer", light)).toBe(true);
    expect(discOut("day", "overcast", "summer", light)).toBe(true);
    expect(discOut("day", "clear", "spring", light)).toBe(false);
    expect(discOut("day", "rain", "summer", light)).toBe(false);
    expect(discOut("day", "fog", "summer", light)).toBe(false);
    expect(discOut("day", "clear", "fall", light)).toBe(false);
    expect(discOut("dusk", "clear", "summer", light)).toBe(false);
    expect(discOut("day", "clear", "summer", { x: 0, z: 0.13 })).toBe(false);
  });

  it("stand on the grass a few meters apart, facing each other, clear of the dog walker's path and the kite flyer", () => {
    const path = Array.from({ length: 81 }, (_, i) => walkPath(i / 80));
    const [a, b] = PLAYERS;
    expect(Math.hypot(a!.x - b!.x, a!.z - b!.z)).toBeGreaterThan(3.5);
    expect(Math.hypot(a!.x - b!.x, a!.z - b!.z)).toBeLessThan(6);
    for (const player of PLAYERS) {
      expect(onLand(player)).toBe(true);
      expect(Math.min(...path.map((p) => Math.hypot(p.x - player.x, p.z - player.z)))).toBeGreaterThan(1);
      for (const wind of [{ x: -0.04, z: 0 }, { x: 0.04, z: 0 }, { x: 0, z: 0.04 }, { x: 0, z: -0.04 }]) {
        const flyer = kiteFlyer(wind);
        expect(Math.hypot(flyer.x - player.x, flyer.z - player.z)).toBeGreaterThan(2.5);
      }
    }
    expect(Math.atan2(b!.x - a!.x, b!.z - a!.z)).toBeCloseTo(a!.yaw);
  });

  it("flies the disc back and forth on a smooth arc, never through the ground", () => {
    let last = discAt(0);
    let landings = 0;
    for (let t = 0.02; t < TOSS_ROUND_SEC * 2; t += 0.02) {
      const disc = discAt(t);
      expect(disc.y).toBeGreaterThanOrEqual(HAND_Y - 1e-9);
      expect(Math.hypot(disc.x - last.x, disc.z - last.z, disc.y - last.y)).toBeLessThan(0.2);
      if (last.flying && !disc.flying) landings += 1;
      last = disc;
    }
    expect(landings).toBe(4);
  });

  it("moves the arms smoothly: a reach for the catch and a wind-up and fling for each throw", () => {
    for (const i of [0, 1]) {
      let last = tosserAt(i, 0);
      let flung = false;
      let reached = false;
      for (let t = 0.02; t < TOSS_ROUND_SEC; t += 0.02) {
        const pose = tosserAt(i, t);
        expect(Math.abs(pose.swing - last.swing)).toBeLessThan(0.3);
        expect(Math.abs(pose.reach - last.reach)).toBeLessThan(0.15);
        expect(Math.abs(pose.raise - last.raise)).toBeLessThan(0.15);
        // The arm is lifted at least as far as it is swung, so it never drops mid-throw.
        expect(pose.raise).toBeGreaterThanOrEqual(Math.min(1, Math.abs(pose.swing)) - 1e-9);
        if (pose.swing > 0.95) flung = true;
        if (pose.reach > 0.95) reached = true;
        last = pose;
      }
      expect(flung).toBe(true);
      expect(reached).toBe(true);
    }
    // The catcher's arm is up when the disc arrives.
    expect(tosserAt(1, FLIGHT_SEC - 0.01).reach).toBeGreaterThan(0.9);
  });

  it("holds still with the disc in hand under reduced motion", () => {
    expect(discAt(1, true)).toEqual(discAt(50, true));
    expect(discAt(1, true).flying).toBe(false);
    expect(tosserAt(0, 1, true)).toEqual(tosserAt(0, 9, true));
  });
});
