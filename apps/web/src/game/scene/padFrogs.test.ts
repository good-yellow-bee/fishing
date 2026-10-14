import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FROG_HOP_SEC, FROG_LEAP_SEC, FROG_PADS, FROG_UNDER_SEC, frogPose, frogsOnPads, stepFrog, type FrogState } from "./padFrogs";

describe("frogs on lily pads", () => {
  it("sit out in spring and summer, by day and into the evening", () => {
    expect(frogsOnPads("dusk", "summer")).toBe(true);
    expect(frogsOnPads("day", "spring")).toBe(true);
    expect(frogsOnPads("night", "summer")).toBe(false);
    expect(frogsOnPads("day", "fall")).toBe(false);
  });

  it("sit on pads out on the water", () => {
    for (const pad of FROG_PADS) expect(inLake(pad.x, pad.z)).toBe(true);
  });

  it("puff their throats now and then, but not for reduced motion", () => {
    let puffed = false;
    for (let t = 0; t < 12; t += 0.1) if (frogPose(0, t).puff > 0.5) puffed = true;
    expect(puffed).toBe(true);
    expect(frogPose(0, 0.3, { mode: "sitting" }, true).puff).toBe(0);
  });

  it("plop in from a close cast, stay under a while, and hop back up", () => {
    const pad = FROG_PADS[0];
    const near = { x: pad.x + 2, z: pad.z, at: 10 };
    let state: FrogState = stepFrog({ mode: "sitting" }, 10, pad, near);
    expect(state.mode).toBe("under");
    expect(frogPose(0, 10 + FROG_LEAP_SEC / 2, state).hidden).toBe(false);
    const under = frogPose(0, 10 + FROG_LEAP_SEC + 0.3, state);
    expect(under.hidden).toBe(true);
    expect(under.ring).toBeGreaterThan(0);
    expect(frogPose(0, 10 + FROG_LEAP_SEC + FROG_UNDER_SEC + FROG_HOP_SEC, state).dx).toBeCloseTo(0);
    state = stepFrog(state, 10 + FROG_LEAP_SEC + FROG_UNDER_SEC + FROG_HOP_SEC, pad, near);
    expect(state.mode).toBe("sitting");
  });

  it("ignores a far cast", () => {
    const far = { x: 0, z: 0, at: 5 };
    expect(stepFrog({ mode: "sitting" }, 5, FROG_PADS[1], far).mode).toBe("sitting");
  });
});
