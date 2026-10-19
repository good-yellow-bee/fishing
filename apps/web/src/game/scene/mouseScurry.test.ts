import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { CRUMB, MOUSE_Y, VISIT_EVERY_SEC, VISIT_SEC, mouseAt, mouseOut } from "./mouseScurry";

describe("dock mouse", () => {
  it("comes out on evenings and nights from spring to fall, but not in the rain", () => {
    expect(mouseOut("dusk", "clear", "summer")).toBe(true);
    expect(mouseOut("night", "overcast", "fall")).toBe(true);
    expect(mouseOut("night", "clear", "spring")).toBe(true);
    expect(mouseOut("day", "clear", "summer")).toBe(false);
    expect(mouseOut("dawn", "clear", "summer")).toBe(false);
    expect(mouseOut("night", "rain", "summer")).toBe(false);
    expect(mouseOut("dusk", "clear", "winter")).toBe(false);
  });

  it("stays on the boards behind the angler while it is up on them", () => {
    for (let t = 0; t < VISIT_EVERY_SEC * 2; t += 0.05) {
      const pose = mouseAt(t);
      if (!pose.here || pose.y < MOUSE_Y) continue;
      expect(pose.x).toBeGreaterThanOrEqual(DOCK_PLANKS.minX);
      expect(pose.x).toBeLessThanOrEqual(DOCK_PLANKS.maxX);
      expect(pose.z).toBeGreaterThan(DOCK_STAND_Z + 0.5);
      expect(pose.z).toBeLessThan(DOCK_PLANKS.maxZ);
    }
  });

  it("is away most of the time, and visits once a while for a few seconds", () => {
    let seen = 0;
    for (let t = 0; t < VISIT_EVERY_SEC * 4; t += 0.1) if (mouseAt(t).here) seen += 0.1;
    expect(seen).toBeGreaterThan(VISIT_SEC * 3 - 1);
    expect(seen).toBeLessThan(VISIT_SEC * 4 + 1);
  });

  it("moves without jumps, and sits up only at the crumb", () => {
    let last = mouseAt(0);
    for (let t = 0.02; t < VISIT_EVERY_SEC * 2; t += 0.02) {
      const pose = mouseAt(t);
      if (pose.here && last.here) expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThan(0.06);
      if (pose.sitting > 0) expect(Math.hypot(pose.x - CRUMB.x, pose.z - CRUMB.z)).toBeLessThan(1e-9);
      last = pose;
    }
  });

  it("sits still at the crumb with reduced motion", () => {
    expect(mouseAt(5, true)).toEqual(mouseAt(80, true));
    expect(mouseAt(5, true).x).toBe(DOCK_STAND_X + 0.12);
  });
});
