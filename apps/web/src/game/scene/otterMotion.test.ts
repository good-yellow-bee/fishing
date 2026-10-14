import { describe, expect, it } from "vitest";
import { inLake, LAKE_CENTER_Z } from "@stillwater/shared";
import { OTTER_HIDE_SEC, OTTER_LAP_SEC, OTTER_SWIM_SEC, otterOut, otterPose, otterRoute, stepOtter } from "./otterMotion";

const NO_SPLASH = { x: 0, z: 0, at: Number.NEGATIVE_INFINITY };

describe("otter", () => {
  it("is out at dawn and dusk, but not in winter", () => {
    expect(otterOut("dawn", "spring")).toBe(true);
    expect(otterOut("dusk", "fall")).toBe(true);
    expect(otterOut("day", "summer")).toBe(false);
    expect(otterOut("night", "summer")).toBe(false);
    expect(otterOut("dawn", "winter")).toBe(false);
  });

  it("keeps to the water along the far bank and turns round at each end", () => {
    for (let t = 0; t < OTTER_LAP_SEC; t += 3) {
      const { x, z } = otterRoute(t);
      expect(inLake(x, z)).toBe(true);
      expect(z).toBeLessThan(LAKE_CENTER_Z - 6);
    }
    // Heading east on the way out, west on the way back.
    expect(Math.sin(otterRoute(1).yaw)).toBeGreaterThan(0);
    expect(Math.sin(otterRoute(OTTER_LAP_SEC / 2 + 1).yaw)).toBeLessThan(0);
  });

  it("swims at the top, then porpoises under and back up", () => {
    expect(otterPose(1).under).toBe(0);
    expect(otterPose(OTTER_SWIM_SEC + 0.4).under).toBeGreaterThan(0);
    expect(otterPose(OTTER_SWIM_SEC + 1.5).under).toBe(1);
  });

  it("slips under when a cast lands close and comes back up after a while", () => {
    const at = otterRoute(10);
    const near = { x: at.x + 2, z: at.z, at: 10 };
    const far = { x: at.x + 9, z: at.z, at: 10 };
    expect(stepOtter({ mode: "swimming" }, 10.1, at, far)).toEqual({ mode: "swimming" });
    const hiding = stepOtter({ mode: "swimming" }, 10.1, at, near);
    expect(hiding).toEqual({ mode: "hiding", since: 10.1 });
    expect(otterPose(12, hiding).under).toBe(1);
    expect(stepOtter(hiding, 10.1 + OTTER_HIDE_SEC, at, NO_SPLASH)).toEqual({ mode: "swimming" });
    // A stale splash never scares it.
    expect(stepOtter({ mode: "swimming" }, 20, at, near)).toEqual({ mode: "swimming" });
  });
});
