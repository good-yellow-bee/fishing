import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { CABIN_AT } from "./cabinLook";
import { OWL_TREE } from "./owlMotion";
import { RUN_SEC, TRACK_LENGTH, TURN_SEC, skiAt, skiTrack, skiingOut } from "./skiTour";
import { armShape, legShape, skiShape, torsoShape } from "./Skier";

describe("ski tour", () => {
  it("is out by day in winter, unless it rains or the fog is down", () => {
    expect(skiingOut("day", "clear", "winter")).toBe(true);
    expect(skiingOut("day", "overcast", "winter")).toBe(true);
    expect(skiingOut("day", "fog", "winter")).toBe(false);
    expect(skiingOut("dusk", "clear", "winter")).toBe(false);
    expect(skiingOut("day", "clear", "fall")).toBe(false);
  });

  it("keeps the track on the far bank, out of the water and clear of the cabin and the owl's tree", () => {
    for (let i = 0; i <= 100; i += 1) {
      const p = skiTrack(i / 100);
      expect(inLake(p.x, p.z)).toBe(false);
      expect(p.z).toBeLessThan(-13);
      expect(Math.hypot(p.x - CABIN_AT.x, p.z - CABIN_AT.z)).toBeGreaterThan(2);
      expect(Math.hypot(p.x - OWL_TREE.x, p.z - OWL_TREE.z)).toBeGreaterThan(0.6);
    }
    expect(skiTrack(0).x).toBeLessThan(skiTrack(1).x);
  });

  it("strides along at a skier's pace, facing the way it goes", () => {
    const speed = TRACK_LENGTH / RUN_SEC;
    expect(speed).toBeGreaterThan(0.6);
    expect(speed).toBeLessThan(2);
    for (const t of [8, 15, 22, RUN_SEC + TURN_SEC + 12]) {
      const a = skiAt(t);
      const b = skiAt(t + 0.2);
      const moved = Math.atan2(b.x - a.x, b.z - a.z);
      expect(Math.cos(moved - a.yaw)).toBeGreaterThan(0.95);
      expect(a.effort).toBeGreaterThan(0.3);
    }
  });

  it("swings its legs through full strides mid-run", () => {
    const strides = Array.from({ length: 80 }, (_, i) => skiAt(RUN_SEC / 2 - 2 + i * 0.05).stride);
    expect(Math.max(...strides)).toBeGreaterThan(0.8);
    expect(Math.min(...strides)).toBeLessThan(-0.8);
  });

  it("turns round at the end of the track and comes back", () => {
    const before = skiAt(RUN_SEC - 0.01);
    const after = skiAt(RUN_SEC + TURN_SEC + 0.01);
    expect(Math.cos(after.yaw - before.yaw)).toBeLessThan(-0.95);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.05);
    expect(skiAt(RUN_SEC + TURN_SEC / 2).effort).toBe(0);
  });

  it("stands still for reduced motion", () => {
    expect(skiAt(3, true)).toEqual(skiAt(70, true));
    expect(skiAt(3, true).stride).toBe(0);
  });

  it("builds the skier's parts", () => {
    for (const shape of [torsoShape(), legShape(), armShape(), skiShape()]) {
      expect(shape.getAttribute("position").count).toBeGreaterThan(0);
      shape.dispose();
    }
  });
});
