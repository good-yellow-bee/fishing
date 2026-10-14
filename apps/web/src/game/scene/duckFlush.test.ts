import { describe, expect, it } from "vitest";
import {
  DUCK_AWAY_SEC,
  DUCK_FLUSH_SEC,
  DUCK_RETURN_SEC,
  DUCK_SCARE_RADIUS,
  SPLASH_FRESH_SEC,
  duckFlush,
  duckReturn,
  lastSplash,
  markSplash,
  stepDuck,
  type DuckState,
} from "./duckFlush";

const paddling: DuckState = { mode: "paddling" };

describe("duck flush", () => {
  it("flushes only on a fresh splash within the scare radius, straight away from it", () => {
    const at = { x: 1.8, z: 2.4 };
    const flushed = stepDuck(paddling, 10.1, at, { x: 0, z: 0, at: 10 });
    expect(flushed).toMatchObject({ mode: "flushed", since: 10.1, from: at });
    if (flushed.mode !== "flushed") throw new Error("not flushed");
    expect(flushed.dir.x).toBeCloseTo(0.6);
    expect(flushed.dir.z).toBeCloseTo(0.8);
    expect(stepDuck(paddling, 10.1, { x: DUCK_SCARE_RADIUS + 0.1, z: 0 }, { x: 0, z: 0, at: 10 })).toBe(paddling);
    expect(stepDuck(paddling, 10 + SPLASH_FRESH_SEC + 0.01, at, { x: 0, z: 0, at: 10 })).toBe(paddling);
    expect(stepDuck(paddling, 5, at, { x: 0, z: 0, at: Number.NEGATIVE_INFINITY })).toBe(paddling);
    expect(stepDuck(paddling, 10, at, { x: 1.8, z: 2.4, at: 10 })).toMatchObject({ mode: "flushed", dir: { x: 1, z: 0 } });
  });

  it("flies off, stays away, glides back and paddles again", () => {
    let state = stepDuck(paddling, 0, { x: 1, z: 0 }, { x: 0, z: 0, at: 0 });
    expect(state.mode).toBe("flushed");
    state = stepDuck(state, DUCK_FLUSH_SEC - 0.01, { x: 0, z: 0 }, { x: 0, z: 0, at: 0 });
    expect(state.mode).toBe("flushed");
    state = stepDuck(state, DUCK_FLUSH_SEC, { x: 0, z: 0 }, { x: 0, z: 0, at: 0 });
    expect(state.mode).toBe("away");
    state = stepDuck(state, DUCK_FLUSH_SEC + DUCK_AWAY_SEC, { x: 0, z: 0 }, { x: 0, z: 0, at: 0 });
    expect(state.mode).toBe("returning");
    state = stepDuck(state, DUCK_FLUSH_SEC + DUCK_AWAY_SEC + DUCK_RETURN_SEC, { x: 0, z: 0 }, { x: 0, z: 0, at: 0 });
    expect(state).toEqual({ mode: "paddling" });
  });

  it("starts on the water, climbs away from the splash and ends far off", () => {
    const from = { x: 2, z: 1 };
    const dir = { x: 0, z: -1 };
    const start = duckFlush(0, from, dir);
    expect(start.x).toBeCloseTo(2);
    expect(start.y).toBe(0);
    let lastY = -1;
    let lastReach = -1;
    for (let age = 0; age <= DUCK_FLUSH_SEC; age += 0.1) {
      const pose = duckFlush(age, from, dir);
      const reach = from.z - pose.z;
      expect(pose.y).toBeGreaterThanOrEqual(lastY);
      expect(reach).toBeGreaterThanOrEqual(lastReach);
      lastY = pose.y;
      lastReach = reach;
      expect(Math.abs(pose.x - from.x)).toBeLessThan(1e-9);
    }
    const end = duckFlush(DUCK_FLUSH_SEC, from, dir);
    expect(end.y).toBeGreaterThan(8);
    expect(from.z - end.z).toBeGreaterThan(30);
    expect(end.yaw).toBeCloseTo(Math.PI);
  });

  it("glides back down onto the paddling spot, facing it", () => {
    const to = { x: -6, z: 3 };
    const dir = { x: 1, z: 0 };
    const start = duckReturn(0, to, dir);
    expect(start.y).toBeGreaterThan(4);
    expect(start.x).toBeGreaterThan(to.x + 10);
    expect(start.yaw).toBeCloseTo(-Math.PI / 2);
    expect(duckReturn(DUCK_RETURN_SEC, to, dir)).toMatchObject({ x: to.x, y: 0, z: to.z });
  });

  it("remembers the last splash", () => {
    markSplash(4, -2, 12.5);
    expect(lastSplash).toEqual({ x: 4, z: -2, at: 12.5 });
  });
});
