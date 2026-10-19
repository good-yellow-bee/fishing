import { describe, expect, it } from "vitest";
import { CAP_LEAF_EVERY_SEC, CAP_LEAF_FALL_SEC, CAP_LEAF_REST, CAP_LEAF_SLIDE_SEC, capLeafAt } from "./capLeaf";

function firstHere() {
  for (let t = 0; t < CAP_LEAF_EVERY_SEC * 2; t += 0.05) if (capLeafAt(t).here) return t;
  throw new Error("no leaf");
}

const onCap = (t: number, cast?: number) => {
  const pose = capLeafAt(t, cast);
  return pose.here && pose.x === CAP_LEAF_REST.x && pose.y === CAP_LEAF_REST.y && pose.z === CAP_LEAF_REST.z;
};

describe("a leaf on the angler's cap", () => {
  it("comes spinning down from above and settles on the cap, and rides there with no cast", () => {
    const start = firstHere();
    expect(capLeafAt(start).y).toBeGreaterThan(CAP_LEAF_REST.y + 0.5);
    expect(onCap(start + CAP_LEAF_FALL_SEC + 0.1)).toBe(true);
    // Rounds go by with no cast: the same leaf stays put, no new one drops through it.
    for (let t = start + CAP_LEAF_FALL_SEC + 0.1; t < start + CAP_LEAF_EVERY_SEC * 3; t += 0.5) expect(onCap(t)).toBe(true);
  });

  it("falls without jumps", () => {
    const start = firstHere();
    let last = capLeafAt(start);
    for (let t = start; t < start + CAP_LEAF_FALL_SEC + 0.5; t += 1 / 60) {
      const pose = capLeafAt(t);
      expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.08);
      last = pose;
    }
  });

  it("slides off the brim when you cast and is gone, until the next round brings another", () => {
    const start = firstHere();
    const cast = start + CAP_LEAF_FALL_SEC + 5;
    const off = capLeafAt(cast + 0.3, cast);
    expect(off.here).toBe(true);
    expect(off.x).toBeGreaterThan(CAP_LEAF_REST.x);
    expect(capLeafAt(cast + CAP_LEAF_SLIDE_SEC + 0.1, cast).here).toBe(false);
    expect(capLeafAt(start + CAP_LEAF_EVERY_SEC - 0.1, cast).here).toBe(false);
    expect(capLeafAt(start + CAP_LEAF_EVERY_SEC + 0.1, cast).here).toBe(true);
    expect(onCap(start + CAP_LEAF_EVERY_SEC + CAP_LEAF_FALL_SEC + 0.1, cast)).toBe(true);
  });

  it("lands first when you cast while it is still falling, then slides off", () => {
    const start = firstHere();
    const cast = start + 1;
    expect(capLeafAt(start + 2, cast)).toEqual(capLeafAt(start + 2));
    expect(capLeafAt(start + CAP_LEAF_FALL_SEC + 0.3, cast).x).toBeGreaterThan(CAP_LEAF_REST.x);
    expect(capLeafAt(start + CAP_LEAF_FALL_SEC + CAP_LEAF_SLIDE_SEC + 0.1, cast).here).toBe(false);
  });

  it("sits still on the cap with reduced motion, and a cast simply takes it away", () => {
    const start = firstHere();
    const sat = capLeafAt(start + 0.5, -Infinity, true);
    expect([sat.here, sat.y]).toEqual([true, CAP_LEAF_REST.y]);
    expect(capLeafAt(start + 1, -Infinity, true)).toEqual(capLeafAt(start + 30, -Infinity, true));
    expect(capLeafAt(start + 10.1, start + 10, true).here).toBe(false);
  });
});
