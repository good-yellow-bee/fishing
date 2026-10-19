import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { BEAT, LOOP_SEC, gliderAt, paragliderOut } from "./paraglideRidge";

const BREEZE = { x: 0.06, z: 0.02 };

describe("paraglider", () => {
  it("soars on fine, breezy days from spring to fall", () => {
    expect(paragliderOut("day", "clear", "summer", BREEZE)).toBe(true);
    expect(paragliderOut("day", "partly-cloudy", "spring", BREEZE)).toBe(true);
    expect(paragliderOut("day", "clear", "summer", { x: 0.01, z: 0 })).toBe(false);
    expect(paragliderOut("day", "overcast", "summer", BREEZE)).toBe(false);
    expect(paragliderOut("dusk", "clear", "summer", BREEZE)).toBe(false);
    expect(paragliderOut("day", "clear", "winter", BREEZE)).toBe(false);
  });

  it("keeps out in front of the hills along its beat, moving and turning smoothly", () => {
    let last = gliderAt(0);
    for (let t = 0.2; t < LOOP_SEC; t += 0.2) {
      const pose = gliderAt(t);
      for (const up of [0, 0.3, 0.6]) {
        const face = hillFront(pose.x, pose.y + up);
        if (face !== null) expect(pose.z).toBeGreaterThan(face + 1);
      }
      expect(Math.abs(pose.x - BEAT.x)).toBeLessThanOrEqual(BEAT.reach + 1e-9);
      expect(Math.abs(pose.x - last.x)).toBeLessThan(0.12);
      expect(Math.abs(pose.y - last.y)).toBeLessThan(0.02);
      const turn = Math.abs(((pose.yaw - last.yaw + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      expect(turn).toBeLessThan(0.15);
      expect(Math.abs(pose.bank)).toBeLessThanOrEqual(0.4);
      last = pose;
    }
  });

  it("heads one way along the ridge and back the other", () => {
    expect(Math.sin(gliderAt(LOOP_SEC * 0.1).yaw)).toBeGreaterThan(0.5);
    expect(Math.sin(gliderAt(LOOP_SEC * 0.6).yaw)).toBeLessThan(-0.5);
  });

  it("holds still under reduced motion", () => {
    expect(gliderAt(3, true)).toEqual(gliderAt(50, true));
  });
});

describe("paraglider and windmill", () => {
  it("turns back short of the windmill's sails", async () => {
    const { HUB, MILL_AT, MILL_SCALE, SAIL_REACH } = await import("./millSails");
    for (let t = 0; t < LOOP_SEC; t += 0.5) expect(gliderAt(t).x + 0.8).toBeLessThan(MILL_AT.x - SAIL_REACH * MILL_SCALE);
    expect(HUB.y).toBeGreaterThan(0);
  });
});
