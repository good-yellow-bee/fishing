import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import {
  MOOSE_CYCLE,
  MOOSE_FEED_A,
  MOOSE_FEED_B,
  MOOSE_FEED_SEC,
  MOOSE_FIRST,
  MOOSE_SCARE_RADIUS,
  MOOSE_TROT_SEC,
  MOOSE_WADE_Y,
  MOOSE_WALK_IN_SEC,
  MOOSE_WOODS,
  mooseAntlers,
  mooseOut,
  moosePose,
  mooseY,
  stepMoose,
  type MooseState,
} from "./mooseWade";

const NO_SPLASH = { x: 0, z: 0, at: Number.NEGATIVE_INFINITY };
const FEEDING = MOOSE_FIRST + MOOSE_WALK_IN_SEC + 2;

describe("the moose", () => {
  it("comes at dawn and dusk from spring to fall, never in rain", () => {
    expect(mooseOut("dawn", "clear", "summer")).toBe(true);
    expect(mooseOut("dusk", "fog", "fall")).toBe(true);
    expect(mooseOut("day", "clear", "summer")).toBe(false);
    expect(mooseOut("dawn", "rain", "summer")).toBe(false);
    expect(mooseOut("dawn", "clear", "winter")).toBe(false);
  });

  it("carries antlers in summer and fall only", () => {
    expect(mooseAntlers("summer")).toBe(true);
    expect(mooseAntlers("fall")).toBe(true);
    expect(mooseAntlers("spring")).toBe(false);
  });

  it("feeds belly-deep in the lake and comes out of trees on the bank", () => {
    for (const patch of [MOOSE_FEED_A, MOOSE_FEED_B]) {
      expect(inLake(patch.x, patch.z)).toBe(true);
      expect(mooseY(patch.x, patch.z)).toBeCloseTo(MOOSE_WADE_Y);
    }
    expect(inLake(MOOSE_WOODS.x, MOOSE_WOODS.z)).toBe(false);
    expect(mooseY(MOOSE_WOODS.x, MOOSE_WOODS.z)).toBeCloseTo(0);
  });

  it("is away when you arrive, walks in, then puts its head under to feed", () => {
    expect(moosePose(1).hidden).toBe(true);
    const walking = moosePose(MOOSE_FIRST + MOOSE_WALK_IN_SEC / 2);
    expect(walking.hidden).toBe(false);
    expect(walking.gait).not.toBe(0);
    let under = 0;
    let up = 0;
    for (let t = FEEDING; t < FEEDING + MOOSE_FEED_SEC - 3; t += 0.25) {
      const pose = moosePose(t);
      expect(pose.x).toBeCloseTo(MOOSE_FEED_A.x);
      if (pose.head > 0.95) under += 1;
      if (pose.head === 0) up += 1;
    }
    expect(under).toBeGreaterThan(0);
    expect(up).toBeGreaterThan(0);
  });

  it("goes back into the trees before the next visit", () => {
    expect(moosePose(MOOSE_FIRST + MOOSE_CYCLE - 1).hidden).toBe(true);
  });

  it("trots off from a cast landing close, and comes back on the next visit", () => {
    const at = moosePose(FEEDING);
    const splash = { x: at.x + MOOSE_SCARE_RADIUS - 1, z: at.z, at: FEEDING };
    let state: MooseState = stepMoose({ mode: "visiting" }, FEEDING + 0.1, splash);
    expect(state.mode).toBe("fled");
    const off = moosePose(FEEDING + MOOSE_TROT_SEC / 2, state);
    expect(off.head).toBe(0);
    expect(Math.hypot(off.x - MOOSE_WOODS.x, off.z - MOOSE_WOODS.z)).toBeLessThan(Math.hypot(at.x - MOOSE_WOODS.x, at.z - MOOSE_WOODS.z));
    expect(moosePose(FEEDING + MOOSE_TROT_SEC + 1, state).hidden).toBe(true);
    state = stepMoose(state, FEEDING + MOOSE_CYCLE, NO_SPLASH);
    expect(state.mode).toBe("visiting");
  });

  it("ignores a cast landing far off", () => {
    const at = moosePose(FEEDING);
    const splash = { x: at.x + MOOSE_SCARE_RADIUS + 3, z: at.z, at: FEEDING };
    expect(stepMoose({ mode: "visiting" }, FEEDING + 0.1, splash).mode).toBe("visiting");
  });

  it("stands still at its first patch, head up, for reduced motion", () => {
    const pose = moosePose(FEEDING + 3, { mode: "visiting" }, true);
    expect(pose).toMatchObject({ x: MOOSE_FEED_A.x, z: MOOSE_FEED_A.z, head: 0, gait: 0, hidden: false });
  });
});
