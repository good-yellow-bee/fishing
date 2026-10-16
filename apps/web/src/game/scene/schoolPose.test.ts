import { describe, expect, it } from "vitest";
import { LURKER_CLOSE, LURKER_RADIUS, lurkerPose, SCHOOL_SIZE, schoolPose } from "./schoolPose";

describe("schoolPose", () => {
  it("keeps every fish within a meter of the float", () => {
    for (let i = 0; i < SCHOOL_SIZE; i++) {
      for (const t of [0, 1.3, 7, 42]) {
        const { dx, dz } = schoolPose(i, t);
        expect(Math.hypot(dx, dz)).toBeGreaterThan(0.4);
        expect(Math.hypot(dx, dz)).toBeLessThan(1);
      }
    }
  });

  it("spreads the fish out instead of stacking them", () => {
    const spots = Array.from({ length: SCHOOL_SIZE }, (_, i) => schoolPose(i, 0));
    for (let a = 0; a < spots.length; a++)
      for (let b = a + 1; b < spots.length; b++)
        expect(Math.hypot(spots[a].dx - spots[b].dx, spots[a].dz - spots[b].dz)).toBeGreaterThan(0.2);
  });

  it("moves the fish over time", () => {
    const a = schoolPose(1, 0);
    const b = schoolPose(1, 1);
    expect(Math.hypot(a.dx - b.dx, a.dz - b.dz)).toBeGreaterThan(0.1);
  });
});

describe("lurkerPose", () => {
  it("circles wide of the school, slowly", () => {
    for (const t of [0, 3, 11, 40]) {
      const { dx, dz } = lurkerPose(t);
      expect(Math.hypot(dx, dz)).toBeGreaterThan(1.2);
      expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(LURKER_RADIUS);
    }
    const a = lurkerPose(0);
    const b = lurkerPose(1);
    expect(Math.hypot(a.dx - b.dx, a.dz - b.dz)).toBeLessThan(0.5);
  });

  it("closes in on the float as the fish comes for the bait", () => {
    const far = lurkerPose(5, 0);
    const near = lurkerPose(5, 1);
    expect(Math.hypot(near.dx, near.dz)).toBeLessThan(Math.hypot(far.dx, far.dz) * (1 - LURKER_CLOSE) + 1e-9);
    expect(lurkerPose(5, 3)).toEqual(near);
    expect(Math.hypot(lurkerPose(5, 0.5).dx, lurkerPose(5, 0.5).dz)).toBeLessThan(Math.hypot(far.dx, far.dz));
  });
});
