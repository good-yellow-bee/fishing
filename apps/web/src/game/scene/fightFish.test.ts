import { LAKE_CENTER_Z, inLake } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fishLeadMeters, fishSideMeters } from "./fightMotion.ts";
import { bedHeight, waterHeight } from "./water.ts";
import {
  FIGHT_FISH_SCALE,
  FIGHT_HALF_H,
  FIGHT_HALF_W,
  FIGHT_MOUTH_Y,
  FIGHT_MOUTH_Z,
  FIGHT_NOSE,
  FIGHT_TAIL,
  FIGHT_WAG,
  fightFishMode,
  fightFishPose,
  fightLineEnd,
  type FightFishPose,
} from "./fightFish.ts";

const ANGLER = { x: 0, z: 6.8 };
const TIME = 1.4;
const RUN_LEAD = fishLeadMeters(2, false);
const HAUL_LEAD = fishLeadMeters(0, true);

function onDock(x: number, z: number) {
  return x >= -1.05 && x <= 1.05 && z >= 5.2 && z <= 8.5;
}

function turned(lx: number, ly: number, lz: number, pose: FightFishPose) {
  const y1 = ly * Math.cos(pose.pitch) - lz * Math.sin(pose.pitch);
  const z1 = ly * Math.sin(pose.pitch) + lz * Math.cos(pose.pitch);
  return {
    x: pose.x + lx * Math.cos(pose.yaw) + z1 * Math.sin(pose.yaw),
    y: pose.y + y1,
    z: pose.z - lx * Math.sin(pose.yaw) + z1 * Math.cos(pose.yaw),
  };
}

function tips(pose: FightFishPose) {
  const corners = [];
  for (const x of [FIGHT_HALF_W, -FIGHT_HALF_W]) {
    for (const y of [FIGHT_HALF_H, -FIGHT_HALF_H]) {
      for (const z of [FIGHT_NOSE, -FIGHT_TAIL]) corners.push(turned(x, y, z, pose));
    }
  }
  corners.push(turned(0, FIGHT_MOUTH_Y * FIGHT_FISH_SCALE, FIGHT_MOUTH_Z * FIGHT_FISH_SCALE, pose));
  return corners;
}

function reach(pose: FightFishPose) {
  return Math.hypot(pose.x - ANGLER.x, pose.z - ANGLER.z);
}

function expectClear(pose: FightFishPose, time: number) {
  expect(pose.show).toBe(true);
  for (const tip of tips(pose)) {
    expect(inLake(tip.x, tip.z), `${tip.x},${tip.z}`).toBe(true);
    expect(onDock(tip.x, tip.z), `${tip.x},${tip.z}`).toBe(false);
    expect(tip.y).toBeLessThan(waterHeight(tip.x, tip.z, time));
    expect(tip.y).toBeGreaterThan(bedHeight(tip.x, tip.z));
  }
  const mouth = turned(0, FIGHT_MOUTH_Y * FIGHT_FISH_SCALE, FIGHT_MOUTH_Z * FIGHT_FISH_SCALE, pose);
  expect(pose.mouthX).toBeCloseTo(mouth.x, 5);
  expect(pose.mouthY).toBeCloseTo(mouth.y, 5);
  expect(pose.mouthZ).toBeCloseTo(mouth.z, 5);
  expect(pose.mouthY).toBeLessThan(waterHeight(pose.mouthX, pose.mouthZ, time));
}

describe("fighting fish", () => {
  it("stays under the chop through a run and a haul", () => {
    const bobbers = [
      [0, 1.5],
      [2.5, -1],
      [0, LAKE_CENTER_Z],
      [-8, 0],
      [6, -2],
    ] as const;
    const times = [0.2, 1.4, 3.1, 5.6];
    for (const [x, z] of bobbers) {
      for (const time of times) {
        const running = fightFishPose(x, z, ANGLER.x, ANGLER.z, RUN_LEAD, 0, time);
        const hauling = fightFishPose(x, z, ANGLER.x, ANGLER.z, HAUL_LEAD, 0, time);
        const horsing = fightFishPose(x, z, ANGLER.x, ANGLER.z, fishLeadMeters(2, true), 0, time);
        const wide = fightFishPose(x, z, ANGLER.x, ANGLER.z, RUN_LEAD, fishSideMeters(2, 1), time);
        expectClear(running, time);
        expectClear(hauling, time);
        expectClear(horsing, time);
        expectClear(wide, time);
        expect(reach(running)).toBeGreaterThan(reach(hauling) + 0.8);
        expect(reach(running)).toBeGreaterThan(reach(horsing) + 0.25);
      }
    }
  });

  it("stays off the dock while it runs and while it is hauled", () => {
    const bobbers = [
      [0, 5.05],
      [0.8, 4.6],
      [-1.2, 3.4],
      [0.4, 4.9],
    ] as const;
    const times = [0.2, 1.4, 3.1, 5.6];
    for (const [x, z] of bobbers) {
      for (const time of times) {
        for (const side of [fishSideMeters(2, 1), fishSideMeters(2, -1), 0]) {
          const running = fightFishPose(x, z, ANGLER.x, ANGLER.z, RUN_LEAD, side, time);
          const hauling = fightFishPose(x, z, ANGLER.x, ANGLER.z, HAUL_LEAD, side * 0.2, time);
          expectClear(running, time);
          expectClear(hauling, time);
        }
      }
    }
  });

  it("puts the mouth on the line and keeps the body out past it", () => {
    const bobber = { x: 0.4, y: 0.12, z: 1.2 };
    const running = fightFishPose(bobber.x, bobber.z, ANGLER.x, ANGLER.z, RUN_LEAD, 0, TIME);
    const hauling = fightFishPose(bobber.x, bobber.z, ANGLER.x, ANGLER.z, HAUL_LEAD, 0, TIME);
    expectClear(running, TIME);
    expect(Math.hypot(running.mouthX - ANGLER.x, running.mouthZ - ANGLER.z)).toBeLessThan(reach(running) - 0.4);
    expect(Math.hypot(running.mouthX - bobber.x, running.mouthZ - bobber.z)).toBeGreaterThan(
      Math.hypot(hauling.mouthX - bobber.x, hauling.mouthZ - bobber.z) + 0.8,
    );
    expect(fightLineEnd("fight", running, bobber)).toEqual({
      x: running.mouthX,
      y: running.mouthY,
      z: running.mouthZ,
    });
    const bobberEnd = { x: bobber.x, y: bobber.y, z: bobber.z };
    expect(fightLineEnd("waiting", running, bobber)).toEqual(bobberEnd);
    expect(fightLineEnd("hookset", running, bobber)).toEqual(bobberEnd);
    expect(fightLineEnd("result", running, bobber)).toEqual(bobberEnd);
    expect(fightLineEnd("idle", running, bobber)).toEqual(bobberEnd);
    expect(fightLineEnd("casting", running, bobber)).toEqual(bobberEnd);
  });

  it("stays off outside the fight", () => {
    expect(fightFishMode("fight")).toBe("on");
    for (const phase of ["idle", "casting", "waiting", "hookset", "result"] as const) {
      expect(fightFishMode(phase)).toBe("off");
    }
  });

  it("keeps the wagging mesh inside the clearance box", () => {
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let minZ = 0;
    let maxZ = 0;
    for (let i = 0; i <= 12; i += 1) {
      const phase = (i / 12) * Math.PI * 2;
      const root = waggedFish(Math.sin(phase) * 0.2 * FIGHT_WAG, Math.sin(phase - 0.8) * 0.46 * FIGHT_WAG);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      minX = Math.min(minX, box.min.x);
      maxX = Math.max(maxX, box.max.x);
      minY = Math.min(minY, box.min.y);
      maxY = Math.max(maxY, box.max.y);
      minZ = Math.min(minZ, box.min.z);
      maxZ = Math.max(maxZ, box.max.z);
    }
    expect(minX).toBeGreaterThanOrEqual(-FIGHT_HALF_W);
    expect(maxX).toBeLessThanOrEqual(FIGHT_HALF_W);
    expect(minY).toBeGreaterThanOrEqual(-FIGHT_HALF_H);
    expect(maxY).toBeLessThanOrEqual(FIGHT_HALF_H);
    expect(maxZ).toBeLessThanOrEqual(FIGHT_NOSE);
    expect(minZ).toBeGreaterThanOrEqual(-FIGHT_TAIL);
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
  root.scale.setScalar(FIGHT_FISH_SCALE);
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
