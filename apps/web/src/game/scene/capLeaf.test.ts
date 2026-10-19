import { describe, expect, it } from "vitest";
import { CAP_LEAF_EVERY_SEC, CAP_LEAF_FALL_SEC, CAP_LEAF_REST, CAP_LEAF_SLIDE_SEC, CAP_LEAF_START, capLeafAt, capLeafStep, type CapLeafPose, type CapLeafState } from "./capLeaf";

const STEP = 1 / 30;

/** Steps the leaf from the start to `until`, throwing a cast at each of `throws`; returns each frame's time and pose. */
function run(until: number, throws: number[] = []) {
  let state: CapLeafState = CAP_LEAF_START;
  const frames: { t: number; pose: CapLeafPose; state: CapLeafState }[] = [];
  const pending = [...throws];
  for (let t = 0; t <= until; t += STEP) {
    const threw = pending.length > 0 && t >= pending[0]!;
    if (threw) pending.shift();
    state = capLeafStep(state, t, threw);
    frames.push({ t, pose: capLeafAt(state, t), state });
  }
  return frames;
}

const onCap = (pose: CapLeafPose) => pose.here && pose.x === CAP_LEAF_REST.x && pose.y === CAP_LEAF_REST.y;

function noJumps(frames: ReturnType<typeof run>) {
  for (let i = 1; i < frames.length; i++) {
    const [a, b] = [frames[i - 1]!.pose, frames[i]!.pose];
    if (a.here && b.here) expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.1);
  }
}

describe("a leaf on the angler's cap", () => {
  it("comes seesawing down and settles on the cap, and the same leaf stays while you do not cast", () => {
    const frames = run(200);
    const first = frames.find((f) => f.pose.here)!;
    expect(first.pose.y).toBeGreaterThan(CAP_LEAF_REST.y + 0.5);
    const settled = frames.filter((f) => f.t > first.t + CAP_LEAF_FALL_SEC + 0.1);
    expect(settled.every((f) => onCap(f.pose))).toBe(true);
    noJumps(frames);
  });

  it("slides off when you throw a cast, is gone a round, then another comes down", () => {
    const frames = run(200, [100]);
    noJumps(frames);
    const at = (t: number) => frames.find((f) => f.t >= t)!.pose;
    expect(onCap(at(99.9))).toBe(true);
    expect(at(100.3).here && at(100.3).x > CAP_LEAF_REST.x).toBe(true);
    expect(at(100 + CAP_LEAF_SLIDE_SEC + 0.2).here).toBe(false);
    expect(at(100 + CAP_LEAF_SLIDE_SEC + CAP_LEAF_EVERY_SEC - 0.2).here).toBe(false);
    expect(at(100 + CAP_LEAF_SLIDE_SEC + CAP_LEAF_EVERY_SEC + 0.2).here).toBe(true);
  });

  it("recasting while the cap is bare brings no leaf back", () => {
    const frames = run(160, [100, 110, 120]);
    const bare = frames.filter((f) => f.t > 100 + CAP_LEAF_SLIDE_SEC + 0.1 && f.t < 100 + CAP_LEAF_SLIDE_SEC + CAP_LEAF_EVERY_SEC - 0.1);
    expect(bare.every((f) => !f.pose.here)).toBe(true);
  });

  it("lands first when you throw while it is still falling, then slides off", () => {
    const start = run(60).find((f) => f.pose.here)!.t;
    const frames = run(start + 10, [start + 1]);
    noJumps(frames);
    const at = (t: number) => frames.find((f) => f.t >= t)!.pose;
    expect(at(start + 2).y).toBeGreaterThan(CAP_LEAF_REST.y);
    expect(at(start + CAP_LEAF_FALL_SEC + 0.3).x).toBeGreaterThan(CAP_LEAF_REST.x);
    expect(at(start + CAP_LEAF_FALL_SEC + CAP_LEAF_SLIDE_SEC + 0.2).here).toBe(false);
  });

  it("sits still on the cap with reduced motion, and a shake simply takes it away", () => {
    expect(onCap(capLeafAt({ mode: "falling", since: 10, shaken: false }, 11, true))).toBe(true);
    expect(capLeafAt({ mode: "sliding", since: 10 }, 10.2, true).here).toBe(false);
  });
});
