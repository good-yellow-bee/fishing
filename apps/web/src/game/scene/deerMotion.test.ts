import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { DEER_BOUND_SEC, DEER_CYCLE, DEER_DRINK, DEER_FIRST, DEER_WALK_SEC, deerOut, deerPose, deerVisit, stepDeer, type DeerState } from "./deerMotion";

const drinkingAt = DEER_FIRST + DEER_WALK_SEC + 2;

describe("deer", () => {
  it("comes out at dawn and dusk, not in rain", () => {
    expect(deerOut("dawn", "clear")).toBe(true);
    expect(deerOut("dusk", "fog")).toBe(true);
    expect(deerOut("dusk", "rain")).toBe(false);
    expect(deerOut("day", "clear")).toBe(false);
  });

  it("drinks at the water's edge", () => {
    expect(inLake(DEER_DRINK.x, DEER_DRINK.z - 0.6)).toBe(false);
    expect(inLake(DEER_DRINK.x, DEER_DRINK.z + 0.6)).toBe(true);
    const pose = deerPose(drinkingAt);
    expect(pose.hidden).toBe(false);
    expect(pose.x).toBeCloseTo(DEER_DRINK.x);
    expect(pose.head).toBeGreaterThan(0.9);
  });

  it("is away in the trees between visits, and back for the next", () => {
    expect(deerPose(0).hidden).toBe(true);
    expect(deerPose(DEER_FIRST + DEER_CYCLE - 1).hidden).toBe(true);
    expect(deerPose(drinkingAt + DEER_CYCLE).hidden).toBe(false);
  });

  it("bounds off from a close cast and stays away until the next visit", () => {
    const near = { x: DEER_DRINK.x, z: DEER_DRINK.z + 3, at: drinkingAt };
    let state: DeerState = stepDeer({ mode: "visiting" }, drinkingAt, near);
    expect(state.mode).toBe("fled");
    expect(deerPose(drinkingAt + 0.5, state).hidden).toBe(false);
    expect(deerPose(drinkingAt + DEER_BOUND_SEC + 0.1, state).hidden).toBe(true);
    state = stepDeer(state, drinkingAt + 5, near);
    expect(state.mode).toBe("fled");
    state = stepDeer(state, drinkingAt + DEER_CYCLE, near);
    expect(state.mode).toBe("visiting");
    expect(deerVisit(drinkingAt + DEER_CYCLE).visit).toBe(1);
  });

  it("ignores a far cast", () => {
    const far = { x: 0, z: 0, at: drinkingAt };
    expect(stepDeer({ mode: "visiting" }, drinkingAt, far).mode).toBe("visiting");
  });

  it("holds its head up and still for reduced motion", () => {
    const pose = deerPose(drinkingAt, { mode: "visiting" }, true);
    expect(pose.head).toBe(0);
    expect(pose.gait).toBe(0);
  });
});
