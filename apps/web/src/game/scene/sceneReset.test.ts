import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { fightInput, fightView, resetFightView } from "./fightMotion";
import { landView, resetLandView } from "./landMotion";
import { missView, resetMissView } from "./missMotion";
import { anglerPose, resetAnglerPose } from "./pose";
import { resetWaitView, waitView } from "./waitMotion";

describe("scene reset between visits", () => {
  it("puts the angler back on the dock with nowhere to walk", () => {
    Object.assign(anglerPose, { x: -14, z: 12, yaw: 0.3, moving: true, vx: 1, route: [{ x: 1, z: 2 }] });
    resetAnglerPose();
    expect(anglerPose).toMatchObject({ x: DOCK_STAND_X, z: DOCK_STAND_Z, yaw: Math.PI, moving: false, vx: 0 });
    expect(anglerPose.route).toEqual([]);
  });

  it("drops a fight, a landing, a miss and a wait that the last visit left running", () => {
    fightInput.reeling = true;
    Object.assign(fightView, { active: true, surge: 2, tension: 0.9, freezeUntil: 40 });
    Object.assign(landView, { active: true, age: 0.6, swing: 0.5 });
    Object.assign(missView, { active: true, age: 0.2 });
    waitView.age = 3;
    resetFightView();
    resetLandView();
    resetMissView();
    resetWaitView();
    expect(fightInput.reeling).toBe(false);
    expect(fightView).toMatchObject({ active: false, surge: 0, tension: 0.2, freezeUntil: -1 });
    expect(landView).toMatchObject({ active: false, age: -1, swing: 0 });
    expect(missView).toMatchObject({ active: false, age: -1 });
    expect(waitView.age).toBe(-1);
  });
});
