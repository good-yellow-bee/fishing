import { describe, expect, it } from "vitest";
import { PAGE_EVERY_SEC, PAGE_TURN_SEC, PUSH_EVERY_SEC, TIE_HEIGHT, footPush, hammockOut, hammockSwing, hammockTies, hammockTrees, pageTurn } from "./hammockSway";

const tree = (x: number, z: number, scale = 4) => ({ position: [x, 0, z] as const, scale });

describe("hammock between the trees", () => {
  it("is out on dry days in late spring and summer", () => {
    expect(hammockOut("day", "clear", "summer")).toBe(true);
    expect(hammockOut("day", "overcast", "spring")).toBe(true);
    expect(hammockOut("day", "rain", "summer")).toBe(false);
    expect(hammockOut("day", "fog", "summer")).toBe(false);
    expect(hammockOut("dusk", "clear", "summer")).toBe(false);
    expect(hammockOut("day", "clear", "fall")).toBe(false);
  });

  it("hangs between the first neighbouring pair across the lake west of the middle that stand a hammock's length apart", () => {
    const trees = [tree(-8, 12), tree(-5, 12), tree(-24, -13), tree(-17, -14), tree(-15.5, -14), tree(-12, -16), tree(2, -18), tree(5, -18)];
    expect(hammockTrees(trees)).toEqual([trees[4], trees[5]]);
    expect(hammockTrees([tree(-5, 12), tree(-2, 12), tree(2, -18), tree(5, -18)])).toBeNull();
  });

  it("ties its ropes on the facing sides of the trunks", () => {
    const [a, b] = hammockTies(tree(10, -18), tree(13, -18));
    expect(a.y).toBe(TIE_HEIGHT);
    expect(a.x).toBeGreaterThan(10);
    expect(b.x).toBeLessThan(13);
    expect(a.z).toBeCloseTo(-18);
  });

  it("swings smoothly, livelier just after each push, and holds still when motion is reduced", () => {
    let last = hammockSwing(0);
    let most = 0;
    for (let t = 0.05; t < PUSH_EVERY_SEC * 3; t += 0.05) {
      const swing = hammockSwing(t);
      expect(Math.abs(swing - last)).toBeLessThan(0.03);
      most = Math.max(most, Math.abs(swing));
      last = swing;
    }
    expect(most).toBeGreaterThan(0.12);
    expect(most).toBeLessThan(0.3);
    expect(Math.abs(hammockSwing(PUSH_EVERY_SEC - 0.5))).toBeLessThan(Math.abs(hammockSwing(0.8)));
    expect(hammockSwing(5, true)).toBe(0);
  });

  it("turns a page now and then and reaches a foot to the trunk for each push", () => {
    expect(pageTurn(PAGE_TURN_SEC / 2)).toBeCloseTo(0.5);
    expect(pageTurn(PAGE_EVERY_SEC / 2)).toBe(0);
    expect(footPush(PUSH_EVERY_SEC)).toBeCloseTo(1);
    expect(footPush(PUSH_EVERY_SEC / 2)).toBe(0);
    expect(footPush(PUSH_EVERY_SEC - 0.4)).toBeCloseTo(0.5);
    expect(pageTurn(1, true)).toBe(0);
    expect(footPush(PUSH_EVERY_SEC, true)).toBe(0);
  });
});
