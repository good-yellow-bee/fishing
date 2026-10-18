import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { walkPath } from "./dogWalk";
import { LENGTH_SEC, TOWEL_AT, TURN_SEC, swimLane, swimmerAt, swimmingOut } from "./swimLane";

/** How far out past the drawn waterline a point is, as a share of the lake's size (negative is out on the water). */
function past({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) - lakeEdge(Math.atan2(-nz, nx));
}

describe("swimmer", () => {
  it("swims only on clear summer days", () => {
    expect(swimmingOut("day", "clear", "summer")).toBe(true);
    expect(swimmingOut("day", "overcast", "summer")).toBe(false);
    expect(swimmingOut("day", "clear", "spring")).toBe(false);
    expect(swimmingOut("dusk", "clear", "summer")).toBe(false);
  });

  it("keeps the lane out on the water off the far bank, and the towel on the sand", () => {
    for (let u = 0; u <= 1; u += 0.1) {
      const at = swimLane(u);
      expect(past(at)).toBeLessThan(-0.03);
      expect(at.z).toBeLessThan(-10);
    }
    expect(past(TOWEL_AT)).toBeGreaterThan(0);
  });

  it("leaves the towel clear of the dog walker's path", () => {
    for (let u = 0; u <= 1; u += 0.01) {
      const path = walkPath(u);
      expect(Math.hypot(path.x - TOWEL_AT.x, path.z - TOWEL_AT.z)).toBeGreaterThan(0.9);
    }
  });

  it("swims smoothly, surging with each stroke but never going back", () => {
    let last = swimmerAt(0);
    for (let t = 0.05; t < LENGTH_SEC; t += 0.05) {
      const now = swimmerAt(t);
      const step = Math.hypot(now.x - last.x, now.z - last.z);
      expect(step).toBeLessThan(0.08);
      // Eastward along the lane means x grows.
      expect(now.x).toBeGreaterThanOrEqual(last.x - 1e-9);
      last = now;
    }
  });

  it("treads water at the turn, and lifts the head with each pull", () => {
    expect(swimmerAt(LENGTH_SEC + TURN_SEC / 2).going).toBe(0);
    const lifts = Array.from({ length: 34 }, (_, i) => swimmerAt(10 + i * 0.05).lift);
    expect(Math.max(...lifts)).toBeGreaterThan(0.9);
    expect(Math.min(...lifts)).toBeLessThan(0.1);
  });

  it("holds still with reduced motion", () => {
    expect(swimmerAt(4, true)).toEqual(swimmerAt(400, true));
  });
});
