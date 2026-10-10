import { LAKE_CENTER_Z, inLake } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FISH } from "@stillwater/shared";
import { fishSize, landedScale } from "./fishSize.ts";
import { bedHeight, waterHeight } from "./water.ts";
import {
  RISE_HALF_H,
  RISE_HALF_W,
  RISE_NOSE,
  RISE_SCALE,
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

function tips(pose: RisePose, size = 1) {
  const corners = [];
  for (const x of [RISE_HALF_W * size, -RISE_HALF_W * size]) {
    for (const y of [RISE_HALF_H * size, -RISE_HALF_H * size]) {
      for (const z of [RISE_NOSE * size, -RISE_TAIL * size]) corners.push(turned(x, y, z, pose));
    }
  }
  return corners;
}

function expectClear(pose: RisePose, time: number, size = 1) {
  expect(pose.show).toBe(true);
  for (const tip of tips(pose, size)) {
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

  it("keeps the lightest and heaviest fish clear at their own size", () => {
    const weights = FISH.flatMap((fish) => [fish.minWeight, fish.maxWeight]);
    const sizes = [fishSize(Math.min(...weights)), fishSize(Math.max(...weights))];
    const bobbers = [
      [0, 5.05],
      [0.8, 4.6],
      [-1.2, 3.4],
      [2.5, -1],
      [14, -2],
    ] as const;
    for (const size of sizes) {
      for (const [x, z] of bobbers) {
        for (const time of [0.2, 3.1]) {
          for (let i = 0; i <= 4; i += 1) {
            const age = (RISE_SEC * i) / 4;
            expectClear(risePose(age, x, z, ANGLER.x, ANGLER.z, time, size), time, size);
            expectClear(takePose((TAKE_SEC * i) / 4, age, x, z, ANGLER.x, ANGLER.z, time, size), time, size);
            expectClear(turnPose((TURN_SEC * i) / 4, x, z, ANGLER.x, ANGLER.z, time, size), time, size);
          }
        }
      }
    }
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

  it("keeps the wagging mesh inside the clearance box", () => {
    const amp = 1.25;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let minZ = 0;
    let maxZ = 0;
    for (let i = 0; i <= 12; i += 1) {
      const phase = (i / 12) * Math.PI * 2;
      const root = waggedFish(Math.sin(phase) * 0.2 * amp, Math.sin(phase - 0.8) * 0.46 * amp);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      minX = Math.min(minX, box.min.x);
      maxX = Math.max(maxX, box.max.x);
      minY = Math.min(minY, box.min.y);
      maxY = Math.max(maxY, box.max.y);
      minZ = Math.min(minZ, box.min.z);
      maxZ = Math.max(maxZ, box.max.z);
    }
    expect(minX).toBeGreaterThanOrEqual(-RISE_HALF_W);
    expect(maxX).toBeLessThanOrEqual(RISE_HALF_W);
    expect(minY).toBeGreaterThanOrEqual(-RISE_HALF_H);
    expect(maxY).toBeLessThanOrEqual(RISE_HALF_H);
    expect(maxZ).toBeLessThanOrEqual(RISE_NOSE);
    expect(minZ).toBeGreaterThanOrEqual(-RISE_TAIL);
  });
});

function waggedFish(midY: number, tailY: number) {
  const mesh = (
    geo: THREE.BufferGeometry,
    pos?: [number, number, number],
    rot?: [number, number, number],
    scale?: [number, number, number],
  ) => {
    const child = new THREE.Mesh(geo);
    if (pos) child.position.set(...pos);
    if (rot) child.rotation.set(...rot);
    if (scale) child.scale.set(...scale);
    return child;
  };
  const root = new THREE.Group();
  root.scale.setScalar(RISE_SCALE);
  root.add(mesh(new THREE.SphereGeometry(0.42, 12, 8), [0, 0, 0.1], undefined, [1, 0.78, 1.65]));
  root.add(mesh(new THREE.SphereGeometry(0.36, 12, 8), [0, 0.02, 0.72], undefined, [0.9, 0.8, 1]));
  root.add(mesh(new THREE.SphereGeometry(0.045, 7, 5), [0.17, 0.17, 0.93]));
  root.add(mesh(new THREE.SphereGeometry(0.045, 7, 5), [-0.17, 0.17, 0.93]));
  root.add(mesh(new THREE.SphereGeometry(0.32, 7, 4), [0, 0.27, -0.02], [0.2, 0, 0], [0.5, 0.08, 0.48]));
  const middle = new THREE.Group();
  middle.position.set(0, 0, -0.45);
  middle.rotation.y = midY;
  middle.add(mesh(new THREE.SphereGeometry(0.34, 10, 7), [0, 0, -0.15], undefined, [0.85, 0.75, 1]));
  const tail = new THREE.Group();
  tail.position.set(0, 0, -0.4);
  tail.rotation.y = tailY;
  tail.add(mesh(new THREE.ConeGeometry(0.2, 0.5, 7), [0, 0, -0.14], [Math.PI / 2, 0, 0]));
  tail.add(mesh(new THREE.SphereGeometry(0.5, 7, 4), [0.23, 0, -0.34], [0, -0.55, 0], [0.5, 0.08, 0.42]));
  tail.add(mesh(new THREE.SphereGeometry(0.5, 7, 4), [-0.23, 0, -0.34], [0, 0.55, 0], [0.5, 0.08, 0.42]));
  middle.add(tail);
  root.add(middle);
  root.add(mesh(new THREE.SphereGeometry(0.5, 7, 4), [0.38, -0.02, 0.03], [0, -0.35, 0], [0.34, 0.06, 0.25]));
  root.add(mesh(new THREE.SphereGeometry(0.5, 7, 4), [-0.38, -0.02, 0.03], [0, 0.35, 0], [0.34, 0.06, 0.25]));
  return root;
}

function shortestYaw(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

describe("fish size", () => {
  it("grows with weight, so a sturgeon is plainly bigger than a shiner under the bobber and in the hand", () => {
    const shiner = FISH.find((fish) => fish.id === "golden-shiner")!;
    const sturgeon = FISH.find((fish) => fish.id === "sturgeon")!;
    expect(fishSize(shiner.minWeight)).toBeGreaterThanOrEqual(0.7);
    expect(fishSize(sturgeon.maxWeight)).toBeLessThanOrEqual(1.2);
    expect(fishSize(sturgeon.minWeight) - fishSize(shiner.maxWeight)).toBeGreaterThan(0.3);
    expect(landedScale(shiner.minWeight)).toBeGreaterThanOrEqual(0.95);
    expect(landedScale(sturgeon.minWeight) - landedScale(shiner.maxWeight)).toBeGreaterThan(0.35);
    let prev = 0;
    for (let weight = 0; weight <= 80; weight += 0.5) {
      expect(fishSize(weight)).toBeGreaterThanOrEqual(prev);
      prev = fishSize(weight);
    }
  });
});
