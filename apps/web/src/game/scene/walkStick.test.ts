import { describe, expect, it } from "vitest";
import { STICK_DEADZONE, stickPush } from "./walkStick";

describe("stickPush", () => {
  it("pushes forward when the thumb goes up the screen, right when it goes right", () => {
    expect(stickPush(0, -40, 40)).toEqual({ x: 0, y: 1 });
    expect(stickPush(40, 0, 40)).toEqual({ x: 1, y: -0 });
  });

  it("caps the push at the stick's reach and keeps its direction", () => {
    const push = stickPush(300, -300, 40);
    expect(Math.hypot(push.x, push.y)).toBeCloseTo(1, 6);
    expect(push.x).toBeCloseTo(push.y, 6);
  });

  it("is half a push halfway out, and nothing inside the dead zone", () => {
    expect(Math.hypot(...Object.values(stickPush(0, 20, 40)))).toBeCloseTo(0.5, 6);
    expect(stickPush(40 * STICK_DEADZONE * 0.9, 0, 40)).toEqual({ x: 0, y: 0 });
  });
});
