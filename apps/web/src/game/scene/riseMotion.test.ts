import { LAKE_CENTER_Z, inLake } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { bedHeight, waterHeight } from "./water.ts";
import {
  RISE_HALF_H,
  RISE_HALF_W,
  RISE_NOSE,
  RISE_SEC,
  RISE_TAIL,
  TAKE_SEC,
  TURN_SEC,
  riseMode,
  risePose,
  takePose,
  turnPose,
  type RisePose,
} from "./riseMotion.ts";

const ANGLER = { x: 0, z: 6.8 };
const TIME = 1.4;

function onDock(x: number, z: number) {
  return x >= -1.05 && x <= 1.05 && z >= 5.2 && z <= 8.5;
}

function turned(lx: number, ly: number, lz: number, pose: RisePose) {
  const y1 = ly * Math.cos(pose.pitch) - lz * Math.sin(pose.pitch);
  const z1 = ly * Math.sin(pose.pitch) + lz * Math.cos(pose.pitch);
  return {
    x: pose.x + lx * Math.cos(pose.yaw) + z1 * Math.sin(pose.yaw),
    y: pose.y + y1,
    z: pose.z - lx * Math.sin(pose.yaw) + z1 * Math.cos(pose.yaw),
  };
}

function tips(pose: RisePose) {
  return [
    turned(0, RISE_HALF_H, 0, pose),
    turned(0, -RISE_HALF_H, 0, pose),
    turned(0, 0, RISE_NOSE, pose),
    turned(0, 0, -RISE_TAIL, pose),
    turned(RISE_HALF_W, 0, 0, pose),
    turned(-RISE_HALF_W, 0, 0, pose),
  ];
}

function expectClear(pose: RisePose, time: number) {
  expect(pose.show).toBe(true);
  for (const tip of tips(pose)) {
    expect(inLake(tip.x, tip.z)).toBe(true);
    expect(onDock(tip.x, tip.z)).toBe(false);
    expect(tip.y).toBeLessThan(waterHeight(tip.x, tip.z, time));
    expect(tip.y).toBeGreaterThan(bedHeight(tip.x, tip.z));
  }
}

describe("rising fish", () => {
  it("climbs under the bobber while the lure is sitting", () => {
    const bobber = { x: 0.4, z: 2.2 };
    const deep = risePose(0, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
    const high = risePose(RISE_SEC, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
    expectClear(deep, TIME);
    expectClear(high, TIME);
    expect(high.y - deep.y).toBeGreaterThan(0.35);
    expect(Math.hypot(high.x - bobber.x, high.z - bobber.z)).toBeLessThan(
      Math.hypot(deep.x - bobber.x, deep.z - bobber.z) - 0.2,
    );
    let prev = deep.y;
    for (let i = 1; i <= 12; i += 1) {
      const pose = risePose((RISE_SEC * i) / 12, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
      expect(pose.y).toBeGreaterThan(prev - 0.02);
      prev = pose.y;
    }
  });

  it("stays under the surface, above the bed, in the lake, and off the dock", () => {
    const bobbers = [
      [0, 5.05],
      [0.8, 4.6],
      [-1.2, 3.4],
      [0, 1.5],
      [2.5, -1],
      [0, LAKE_CENTER_Z],
      [-8, 0],
      [14, -2],
    ] as const;
    const times = [0.2, 1.4, 3.1, 5.6];
    for (const [x, z] of bobbers) {
      for (const time of times) {
        for (let i = 0; i <= 8; i += 1) {
          const age = (RISE_SEC * i) / 8;
          const pose = risePose(age, x, z, ANGLER.x, ANGLER.z, time);
          expectClear(pose, time);
          const taking = takePose((TAKE_SEC * i) / 8, age, x, z, ANGLER.x, ANGLER.z, time);
          expectClear(taking, time);
          const turning = turnPose((TURN_SEC * i) / 8, x, z, ANGLER.x, ANGLER.z, time);
          expectClear(turning, time);
        }
      }
    }
    const shelf = bedHeight(0, 5.4);
    const offshore = bedHeight(0, LAKE_CENTER_Z);
    expect(shelf).toBeGreaterThan(-0.75);
    expect(shelf).toBeLessThan(-0.45);
    expect(offshore).toBeLessThan(-2.2);
    const risen = risePose(RISE_SEC, 0, LAKE_CENTER_Z, ANGLER.x, ANGLER.z, TIME);
    expect(risen.y).toBeGreaterThan(offshore + RISE_HALF_H);
    expect(risen.y).toBeLessThan(0);
  });

  it("takes the lure on the bite and turns away on the miss", () => {
    const bobber = { x: -0.6, z: 1.2 };
    const held = 0.4;
    const sitting = risePose(held, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
    const bite = takePose(0, held, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
    expect(bite.x).toBeCloseTo(sitting.x);
    expect(bite.y).toBeCloseTo(sitting.y);
    expect(bite.z).toBeCloseTo(sitting.z);
    const taken = takePose(TAKE_SEC, held, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
    expectClear(taken, TIME);
    expect(Math.hypot(taken.x - bobber.x, taken.z - bobber.z)).toBeLessThan(
      Math.hypot(sitting.x - bobber.x, sitting.z - bobber.z) - 0.15,
    );
    const leave = turnPose(0, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
    const gone = turnPose(TURN_SEC, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME);
    expect(leave.x).toBeCloseTo(takePose(TAKE_SEC, RISE_SEC, bobber.x, bobber.z, ANGLER.x, ANGLER.z, TIME).x);
    expectClear(gone, TIME);
    expect(Math.hypot(gone.x - bobber.x, gone.z - bobber.z)).toBeGreaterThan(
      Math.hypot(leave.x - bobber.x, leave.z - bobber.z) + 0.45,
    );
    expect(Math.abs(shortestYaw(leave.yaw, gone.yaw))).toBeGreaterThan(0.6);
  });

  it("stays off through the cast flight, the fight, the retrieve, and the landing", () => {
    expect(riseMode("waiting", true, false, false)).toBe("off");
    expect(riseMode("waiting", false, false, false)).toBe("rise");
    expect(riseMode("hookset", false, false, false)).toBe("take");
    expect(riseMode("result", false, true, false)).toBe("turn");
    expect(riseMode("fight", false, false, false)).toBe("off");
    expect(riseMode("result", false, false, true)).toBe("off");
    expect(riseMode("result", false, true, true)).toBe("off");
    for (const phase of ["idle", "casting"] as const) {
      expect(riseMode(phase, false, false, false)).toBe("off");
    }
  });
});

function shortestYaw(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
