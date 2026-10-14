import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, inLake } from "@stillwater/shared";
import { JUMP_SEC, fishJumpAt, jumpArc, jumpGap, jumpSpot, jumpsOn } from "./fishJump";

describe("jumping fish", () => {
  it("jump more often at dawn and dusk, and not in winter", () => {
    expect(jumpGap("dusk")).toBeLessThan(jumpGap("day"));
    expect(jumpsOn("summer")).toBe(true);
    expect(jumpsOn("winter")).toBe(false);
  });

  it("come up in open water, clear of the dock", () => {
    for (let slot = 0; slot < 200; slot += 1) {
      const spot = jumpSpot(slot);
      expect(inLake(spot.x, spot.z)).toBe(true);
      expect(Math.hypot(spot.x - DOCK_STAND_X, spot.z - DOCK_STAND_Z)).toBeGreaterThan(6.9);
    }
  });

  it("leap once in each gap", () => {
    const gap = jumpGap("day");
    for (let slot = 0; slot < 5; slot += 1) {
      let airborne = 0;
      for (let t = slot * gap; t < (slot + 1) * gap; t += 0.05) {
        const jump = fishJumpAt(t, "day");
        if (jump && jump.progress >= 0 && jump.progress <= 1) airborne += 0.05;
      }
      expect(airborne).toBeGreaterThan(JUMP_SEC - 0.15);
      expect(airborne).toBeLessThan(JUMP_SEC + 0.15);
    }
  });

  it("arcs up nose first and comes down nose first", () => {
    expect(jumpArc(0.5).y).toBeGreaterThan(jumpArc(0.1).y);
    expect(jumpArc(0).pitch).toBeGreaterThan(0);
    expect(jumpArc(1).pitch).toBeLessThan(0);
    expect(jumpArc(1).y).toBeLessThan(0);
  });
});
