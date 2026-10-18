import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { SEAT_AT } from "./brollyFishing";
import { walkPath } from "./dogWalk";
import { FIGHT_ROUND_SEC, KIDS, kidAt, puffAt, snowballAt, snowballOut } from "./snowballFight";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("snowball fight on the far bank", () => {
  it("is on by day in winter unless it is foggy", () => {
    expect(snowballOut("day", "clear", "winter")).toBe(true);
    expect(snowballOut("day", "rain", "winter")).toBe(true);
    expect(snowballOut("day", "fog", "winter")).toBe(false);
    expect(snowballOut("dusk", "clear", "winter")).toBe(false);
    expect(snowballOut("day", "clear", "fall")).toBe(false);
  });

  it("puts the children on the bank a few meters apart, facing each other, clear of the path and the rain angler's seat", () => {
    const [a, b] = KIDS;
    const apart = Math.hypot(a!.x - b!.x, a!.z - b!.z);
    expect(apart).toBeGreaterThan(3.5);
    expect(apart).toBeLessThan(6);
    expect(Math.atan2(b!.x - a!.x, b!.z - a!.z)).toBeCloseTo(a!.yaw);
    const path = Array.from({ length: 81 }, (_, i) => walkPath(i / 80));
    for (const kid of KIDS) {
      expect(onLand(kid)).toBe(true);
      expect(Math.min(...path.map((p) => Math.hypot(p.x - kid.x, p.z - kid.z)))).toBeGreaterThan(1);
      expect(Math.hypot(kid.x - SEAT_AT.x, kid.z - SEAT_AT.z)).toBeGreaterThan(1.5);
    }
  });

  it("flies each snowball on a smooth arc that bursts where it lands, on land", () => {
    let last = snowballAt(0);
    let throws = 0;
    let puffs = 0;
    let lastPuff = puffAt(0);
    for (let t = 0.01; t < FIGHT_ROUND_SEC; t += 0.01) {
      const ball = snowballAt(t);
      if (ball && last) expect(Math.hypot(ball.x - last.x, ball.y - last.y, ball.z - last.z)).toBeLessThan(0.1);
      if (ball) expect(ball.y).toBeGreaterThanOrEqual(-1e-9);
      if (ball && !last) throws += 1;
      const puff = puffAt(t);
      if (puff) {
        expect(onLand(puff)).toBe(true);
        expect(ball).toBeNull();
        if (!lastPuff) puffs += 1;
      }
      lastPuff = puff;
      last = ball;
    }
    expect(throws).toBe(4);
    expect(puffs).toBe(4);
  });

  it("moves the children smoothly: scooping, packing, winding up and throwing, and ducking a miss", () => {
    for (const i of [0, 1]) {
      let last = kidAt(i, 0);
      let ducked = false;
      let threw = false;
      for (let t = 0.01; t < FIGHT_ROUND_SEC + 1; t += 0.01) {
        const pose = kidAt(i, t);
        expect(Math.abs(pose.crouch - last.crouch)).toBeLessThan(0.06);
        expect(Math.abs(pose.pack - last.pack)).toBeLessThan(0.15);
        expect(Math.abs(pose.arm - last.arm)).toBeLessThan(0.25);
        if (pose.arm > 3.3) threw = true;
        if (pose.crouch > 0.95 && snowballAt(t)) ducked = true;
        last = pose;
      }
      expect(threw).toBe(true);
      expect(ducked).toBe(true);
    }
  });

  it("holds the children still under reduced motion", () => {
    expect(kidAt(0, 1, true)).toEqual(kidAt(0, 30, true));
    expect(snowballAt(4, true)).toBeNull();
  });
});
