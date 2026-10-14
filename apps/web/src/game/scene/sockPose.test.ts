import { describe, expect, it } from "vitest";
import { windsockPose } from "./sockPose";

describe("windsockPose", () => {
  it("points downwind", () => {
    expect(windsockPose({ x: 0, z: 0.08 }, 0).yaw).toBeCloseTo(0);
    expect(windsockPose({ x: 0.08, z: 0 }, 0).yaw).toBeCloseTo(Math.PI / 2);
    expect(windsockPose({ x: -0.04, z: 0 }, 0).yaw).toBeCloseTo(-Math.PI / 2);
  });

  it("hangs limp on a calm day and stands out on a strong one, fluttering more as it fills", () => {
    const calm = windsockPose({ x: 0, z: 0 }, 1);
    const light = windsockPose({ x: 0, z: 0.04 }, 1);
    const strong = windsockPose({ x: 0, z: 0.13 }, 1);
    expect(calm.droop).toBeGreaterThan(light.droop);
    expect(light.droop).toBeGreaterThan(strong.droop);
    expect(strong.droop).toBeLessThan(0.15);
    let calmMax = 0;
    let strongMax = 0;
    for (let t = 0; t < 4; t += 0.01) {
      calmMax = Math.max(calmMax, Math.abs(windsockPose({ x: 0, z: 0 }, t).flutter));
      strongMax = Math.max(strongMax, Math.abs(windsockPose({ x: 0, z: 0.13 }, t).flutter));
    }
    expect(strongMax).toBeGreaterThan(calmMax * 2);
  });
});
