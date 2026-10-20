import { describe, expect, it } from "vitest";
import { FOLLOW_ANGLE, TRAIL, TURN_SEC, followPose } from "./followPose";

const toAngler = { x: 0, z: 1 };
const facing = (heading: number) => ({ x: Math.sin(heading), z: Math.cos(heading) });

describe("a pike following the lure in", () => {
  it("trails behind the float, away from the angler, nosing at the lure", () => {
    for (const time of [0, 1.3, 7]) {
      const pose = followPose(time, toAngler, null);
      expect(pose.dx * toAngler.x + pose.dz * toAngler.z).toBeLessThan(-TRAIL * Math.cos(FOLLOW_ANGLE) + 0.15);
      const nose = facing(pose.heading);
      // From its middle, the nose points back at the float.
      expect(nose.x * -pose.dx + nose.z * -pose.dz).toBeGreaterThan(0);
    }
  });

  it("swings round the float as it turns and ends heading away from the angler", () => {
    const start = followPose(0, toAngler, 0);
    const done = followPose(0, toAngler, TURN_SEC * 2);
    // Round to the angler's side of the float, the same distance out, nose pointing away from them.
    expect(done.dz).toBeGreaterThan(0);
    expect(Math.hypot(done.dx, done.dz)).toBeCloseTo(Math.hypot(start.dx, start.dz), 5);
    expect(facing(done.heading).z).toBeLessThan(0);
  });
});
