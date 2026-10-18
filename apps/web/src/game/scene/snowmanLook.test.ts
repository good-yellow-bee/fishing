import { describe, expect, it } from "vitest";
import { SHOP_X, SHOP_Z, inLake } from "@stillwater/shared";
import { SNOWBALLS, SNOWMAN_AT, snowmanUp } from "./snowmanLook";

describe("the snowman by the shack", () => {
  it("stands only in winter", () => {
    expect(snowmanUp("winter")).toBe(true);
    expect(snowmanUp("spring")).toBe(false);
    expect(snowmanUp("summer")).toBe(false);
    expect(snowmanUp("fall")).toBe(false);
  });

  it("stands on dry ground beside the shack, off the angler's spot", () => {
    expect(inLake(SNOWMAN_AT.x, SNOWMAN_AT.z)).toBe(false);
    const fromShack = Math.hypot(SNOWMAN_AT.x - SHOP_X, SNOWMAN_AT.z - SHOP_Z);
    expect(fromShack).toBeGreaterThan(1.5);
    expect(fromShack).toBeLessThan(4);
  });

  it("stacks smaller balls on bigger ones, each resting on the one below", () => {
    expect(SNOWBALLS[0]!.y).toBeLessThanOrEqual(SNOWBALLS[0]!.r);
    for (let i = 1; i < SNOWBALLS.length; i += 1) {
      const below = SNOWBALLS[i - 1]!;
      const ball = SNOWBALLS[i]!;
      expect(ball.r).toBeLessThan(below.r);
      const gap = ball.y - below.y;
      expect(gap).toBeLessThan(ball.r + below.r);
      expect(gap).toBeGreaterThan(Math.max(ball.r, below.r));
    }
  });
});
