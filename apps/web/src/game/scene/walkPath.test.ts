import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, stanceAt, walkableAt } from "@stillwater/shared";
import { clearLine, routeWish, walkPath, WALK_TARGETS, type WalkPoint, type WalkTarget } from "./walkPath";

function walkAlong(fromX: number, fromZ: number, path: { x: number; z: number }[]) {
  let x = fromX;
  let z = fromZ;
  for (const point of path) {
    expect(clearLine(x, z, point.x, point.z)).toBe(true);
    x = point.x;
    z = point.z;
  }
  return { x, z };
}

describe("walkPath", () => {
  it("reaches every signpost from the dock over walkable ground", () => {
    for (const target of Object.keys(WALK_TARGETS) as WalkTarget[]) {
      const goal = WALK_TARGETS[target];
      const path = walkPath(DOCK_STAND_X, DOCK_STAND_Z, goal.x, goal.z);
      expect(path, target).not.toBeNull();
      const end = walkAlong(DOCK_STAND_X, DOCK_STAND_Z, path!);
      expect(end).toEqual(goal);
      expect(stanceAt(end.x, end.z)).toBe(target);
    }
  });

  it("walks back to the dock from the far banks", () => {
    for (const from of [WALK_TARGETS.reeds, WALK_TARGETS.dropoff, WALK_TARGETS.shop]) {
      const path = walkPath(from.x, from.z, DOCK_STAND_X, DOCK_STAND_Z);
      expect(path).not.toBeNull();
      expect(walkAlong(from.x, from.z, path!)).toEqual({ x: DOCK_STAND_X, z: DOCK_STAND_Z });
    }
  });

  it("goes straight when nothing is in the way", () => {
    expect(walkPath(2, 14, 7, 15)).toEqual([{ x: 7, z: 15 }]);
  });

  it("refuses water and ground off the shore", () => {
    expect(walkableAt(0, 0)).toBe(false);
    expect(walkPath(DOCK_STAND_X, DOCK_STAND_Z, 0, 0)).toBeNull();
    expect(walkPath(DOCK_STAND_X, DOCK_STAND_Z, 30, 30)).toBeNull();
    expect(walkPath(DOCK_STAND_X, DOCK_STAND_Z, Number.NaN, 4)).toBeNull();
  });
});

describe("routeWish", () => {
  it("heads for the next corner at full speed and drops it once passed", () => {
    const route = [{ x: 0, z: 10 }, { x: 4, z: 10 }];
    const out = { x: 0, z: 0 };
    routeWish(0, 6, route, 4, out);
    expect(out.x).toBeCloseTo(0);
    expect(out.z).toBeCloseTo(4);
    routeWish(0, 9.9, route, 4, out);
    expect(route).toHaveLength(1);
    expect(out.x).toBeGreaterThan(3.9);
  });

  it("eases into the last point and stops there", () => {
    const route = [{ x: 2, z: 0 }];
    const out = { x: 0, z: 0 };
    routeWish(1.5, 0, route, 4, out);
    expect(out.x).toBeGreaterThan(0);
    expect(out.x).toBeLessThan(4);
    routeWish(1.95, 0, route, 4, out);
    expect(route).toHaveLength(0);
    expect(out).toEqual({ x: 0, z: 0 });
  });

  it("walks every signpost route with the player's wall slide", () => {
    for (const target of Object.keys(WALK_TARGETS) as WalkTarget[]) {
      const goal = WALK_TARGETS[target];
      const route = walkPath(WALK_TARGETS.reeds.x, WALK_TARGETS.reeds.z, goal.x, goal.z) ?? [];
      const out = { x: 0, z: 0 };
      let x = WALK_TARGETS.reeds.x;
      let z = WALK_TARGETS.reeds.z;
      for (let i = 0; i < 4000 && route.length > 0; i += 1) {
        routeWish(x, z, route, 4.35, out);
        // Same slide as PlayerMove's applyWalk.
        const nx = x + out.x * 0.016;
        const nz = z + out.z * 0.016;
        if (walkableAt(nx, nz)) [x, z] = [nx, nz];
        else if (walkableAt(nx, z)) x = nx;
        else if (walkableAt(x, nz)) z = nz;
      }
      expect(route, target).toHaveLength(0);
      expect(stanceAt(x, z), target).toBe(target);
    }
  });
});

/** Walks a signpost's route the way the angler's legs do (Player.tsx: 4.35 m/s top speed, 5.2 m/s² to change pace), sliding along the shore's edge. */
function walkSign(from: WalkPoint, to: WalkPoint, dt: number) {
  const route = walkPath(from.x, from.z, to.x, to.z)!;
  const out = { x: 0, z: 0 };
  let { x, z } = from;
  let vx = 0;
  let vz = 0;
  for (let t = 0; t < 40 && route.length > 0; t += dt) {
    routeWish(x, z, route, 4.35, out);
    const ax = out.x - vx;
    const az = out.z - vz;
    const accel = Math.hypot(ax, az);
    if (accel > 1e-6) {
      const step = Math.min(accel, 5.2 * dt);
      vx += (ax / accel) * step;
      vz += (az / accel) * step;
    }
    const ox = x;
    const oz = z;
    if (walkableAt(x + vx * dt, z + vz * dt)) [x, z] = [x + vx * dt, z + vz * dt];
    else if (walkableAt(x + vx * dt, z)) x += vx * dt;
    else if (walkableAt(x, z + vz * dt)) z += vz * dt;
    vx = (x - ox) / dt;
    vz = (z - oz) / dt;
  }
  return { x, z };
}

describe("sharp bends", () => {
  it("slow the angler into a sharp corner and leave a gentle one at full speed", () => {
    const out = { x: 0, z: 0 };
    // Two meters short of a right-angle turn down onto the pier.
    routeWish(-1, 11.5, [{ x: 1, z: 11.5 }, { x: 1, z: 10.5 }], 4.35, out);
    expect(Math.hypot(out.x, out.z)).toBeLessThan(4.35);
    routeWish(-1, 11.5, [{ x: 1, z: 11.5 }, { x: 5, z: 11 }], 4.35, out);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(4.35);
  });

  it("let every signpost walk arrive from every bank, at 60, 30 and 20 frames a second", () => {
    // Walking to the dock from the reeds, point or inlet once overshot the turn onto the pier at full speed and stopped on the path.
    const targets = Object.keys(WALK_TARGETS) as WalkTarget[];
    for (const dt of [1 / 60, 1 / 30, 1 / 20]) {
      for (const from of targets) {
        for (const to of targets) {
          if (from === to) continue;
          const end = walkSign(WALK_TARGETS[from], WALK_TARGETS[to], dt);
          expect(Math.hypot(end.x - WALK_TARGETS[to].x, end.z - WALK_TARGETS[to].z), `${from} to ${to} at ${Math.round(1 / dt)} fps`).toBeLessThan(0.3);
        }
      }
    }
  });
});
