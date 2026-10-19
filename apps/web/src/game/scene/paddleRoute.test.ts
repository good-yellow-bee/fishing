import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { SWAN_LOOP } from "./swanGlide";
import { LEG_SEC, PADDLE_FROM, PADDLE_TO, STROKES_A_SIDE, STROKE_SEC, TURN_SEC, bladeDip, bladeReach, dogLook, paddleAt, paddleOut } from "./paddleRoute";

const CALM = { x: 0.02, z: 0 };

describe("paddleboarder", () => {
  it("is out on fine, calm summer days", () => {
    expect(paddleOut("day", "clear", "summer", CALM)).toBe(true);
    expect(paddleOut("day", "partly-cloudy", "summer", CALM)).toBe(true);
    expect(paddleOut("day", "overcast", "summer", CALM)).toBe(false);
    expect(paddleOut("day", "clear", "summer", { x: 0.2, z: 0 })).toBe(false);
    expect(paddleOut("dawn", "clear", "summer", CALM)).toBe(false);
    expect(paddleOut("day", "clear", "spring", CALM)).toBe(false);
  });

  it("paddles out and back across the lake, turning in place at each end, without jumps", () => {
    let last = paddleAt(0);
    for (let t = 0.05; t < 2 * (LEG_SEC + TURN_SEC) + 5; t += 0.05) {
      const pose = paddleAt(t);
      expect(inLake(pose.x, pose.z)).toBe(true);
      expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThan(0.05);
      const turned = Math.atan2(Math.sin(pose.yaw - last.yaw), Math.cos(pose.yaw - last.yaw));
      expect(Math.abs(turned)).toBeLessThan(0.05);
      last = pose;
    }
    const there = paddleAt(LEG_SEC + TURN_SEC / 2);
    expect(there.x).toBeCloseTo(PADDLE_TO.x, 1);
    expect(there.z).toBeCloseTo(PADDLE_TO.z, 1);
    const back = paddleAt(2 * LEG_SEC + TURN_SEC * 1.5);
    expect(back.x).toBeCloseTo(PADDLE_FROM.x, 1);
  });

  it("keeps well clear of the swans' loop", () => {
    for (let t = 0; t < 2 * (LEG_SEC + TURN_SEC); t += 0.5) {
      const pose = paddleAt(t);
      expect(Math.hypot((pose.x - SWAN_LOOP.x) / SWAN_LOOP.rx, (pose.z - SWAN_LOOP.z) / SWAN_LOOP.rz)).toBeGreaterThan(1.5);
    }
  });

  it("takes a run of strokes on one side, then swaps the paddle across", () => {
    const run = STROKES_A_SIDE * STROKE_SEC;
    expect(paddleAt(1).side).toBe(1);
    expect(paddleAt(run + 1).side).toBe(-1);
    expect(paddleAt(1).swap).toBe(0);
    expect(paddleAt(run - STROKE_SEC / 2).swap).toBeCloseTo(0.5);
  });

  it("buries the blade through the pull and carries it forward clear of the water", () => {
    expect(bladeReach(0)).toBeCloseTo(1);
    expect(bladeReach(0.55)).toBeCloseTo(-0.4);
    expect(bladeReach(0.999)).toBeCloseTo(1, 1);
    expect(bladeDip(0.3)).toBe(1);
    expect(bladeDip(0.8)).toBe(0);
    for (let s = 0; s < 1; s += 0.01) {
      expect(Math.abs(bladeReach(s + 0.01) - bladeReach(s))).toBeLessThan(0.06);
      expect(Math.abs(bladeDip(s + 0.01) - bladeDip(s))).toBeLessThan(0.21);
    }
  });

  it("has the dog look about smoothly, and holds everything still for reduced motion", () => {
    let last = dogLook(0);
    for (let t = 0.05; t < 30; t += 0.05) {
      const look = dogLook(t);
      expect(Math.abs(look)).toBeLessThanOrEqual(0.9);
      expect(Math.abs(look - last)).toBeLessThan(0.2);
      last = look;
    }
    expect(dogLook(5, true)).toBe(0);
    expect(paddleAt(3, true)).toEqual(paddleAt(90, true));
  });
});
