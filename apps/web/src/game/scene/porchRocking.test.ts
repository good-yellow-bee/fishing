import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { CABIN_AT } from "./cabinLook";
import { CHAIR_AT, LANTERN_AT, ROCK_SEC, lanternFlicker, porchOut, rockerAt } from "./porchRocking";
import { BLOCK_AT, STACK_AT } from "./woodChopping";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("rocking chair in front of the cabin", () => {
  it("is out at dusk and at night from spring to fall unless it rains", () => {
    expect(porchOut("dusk", "clear", "summer")).toBe(true);
    expect(porchOut("night", "overcast", "fall")).toBe(true);
    expect(porchOut("day", "clear", "summer")).toBe(false);
    expect(porchOut("dusk", "rain", "summer")).toBe(false);
    expect(porchOut("dusk", "clear", "winter")).toBe(false);
  });

  it("stands just in front of the cabin, on land, with the lantern beside it, clear of the woodcutter's block and stack", () => {
    for (const spot of [CHAIR_AT, LANTERN_AT]) {
      expect(onLand(spot)).toBe(true);
      expect(Math.hypot(spot.x - CABIN_AT.x, spot.z - CABIN_AT.z)).toBeGreaterThan(1.8);
      expect(Math.hypot(spot.x - CABIN_AT.x, spot.z - CABIN_AT.z)).toBeLessThan(3);
      for (const other of [BLOCK_AT, STACK_AT]) expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThan(1);
    }
    expect(Math.hypot(CHAIR_AT.x - LANTERN_AT.x, CHAIR_AT.z - LANTERN_AT.z)).toBeLessThan(1);
  });

  it("rocks gently and smoothly, and lifts the mug now and then", () => {
    let last = rockerAt(0);
    let sipped = false;
    for (let t = 0.02; t < 30; t += 0.02) {
      const pose = rockerAt(t);
      expect(Math.abs(pose.tip)).toBeLessThan(0.15);
      expect(Math.abs(pose.tip - last.tip)).toBeLessThan(0.01);
      expect(Math.abs(pose.sip - last.sip)).toBeLessThan(0.06);
      if (pose.sip > 0.95) sipped = true;
      last = pose;
    }
    expect(sipped).toBe(true);
    expect(ROCK_SEC).toBeGreaterThan(1.5);
    for (let t = 0; t < 10; t += 0.1) expect(lanternFlicker(t)).toBeGreaterThan(0.75);
  });

  it("sits level and still under reduced motion", () => {
    expect(rockerAt(5, true)).toEqual({ tip: 0, sip: 0 });
    expect(lanternFlicker(5, true)).toBe(1);
  });
});
