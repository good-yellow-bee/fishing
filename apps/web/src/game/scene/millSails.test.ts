import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { FIELDS } from "./hayField";
import { HUB, MILL_AT, MILL_SCALE, PARKED, SAIL_REACH, millPoint, sailAngle, sailSpin } from "./millSails";
import { RUN_FOOT, RUN_TOP } from "./sledRun";

describe("windmill", () => {
  it("stands on the hills, in front of their face up to its sail tips", () => {
    const at = millPoint();
    expect(hillFront(at.x, at.y)).not.toBeNull();
    for (let up = 0; up <= (HUB.y + SAIL_REACH) * MILL_SCALE; up += 0.05) {
      const face = hillFront(at.x, at.y + up);
      if (face !== null) expect(at.z).toBeGreaterThan(face);
    }
  });

  it("keeps its sails clear of the fields and the sled run below", () => {
    const lowestTip = MILL_AT.y + (HUB.y - SAIL_REACH) * MILL_SCALE;
    FIELDS.forEach((field) => {
      if (Math.abs(field.x - MILL_AT.x) < field.halfX + SAIL_REACH) expect(lowestTip).toBeGreaterThan(field.y + field.halfY);
    });
    const along = (MILL_AT.x - RUN_TOP.x) / (RUN_FOOT.x - RUN_TOP.x);
    expect(lowestTip).toBeGreaterThan(RUN_TOP.y + (RUN_FOOT.y - RUN_TOP.y) * along + 0.6);
  });

  it("turns faster as the wind freshens and stands still when calm", () => {
    expect(sailSpin({ x: 0, z: 0 })).toBe(0);
    expect(sailSpin({ x: 0.01, z: 0 })).toBe(0);
    const light = sailSpin({ x: 0.03, z: 0 });
    const fresh = sailSpin({ x: 0.08, z: 0.05 });
    expect(light).toBeGreaterThan(0);
    expect(fresh).toBeGreaterThan(light);
    expect(sailSpin({ x: 0.5, z: 0 })).toBeLessThanOrEqual(1.1);
    expect(sailAngle(10, { x: 0, z: 0 })).toBe(PARKED);
  });

  it("parks its sails under reduced motion", () => {
    expect(sailAngle(37, { x: 0.1, z: 0 }, true)).toBe(PARKED);
    expect(sailAngle(37, { x: 0.1, z: 0 })).not.toBe(PARKED);
  });
});
