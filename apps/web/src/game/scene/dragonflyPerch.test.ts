import { describe, expect, it } from "vitest";
import { APPROACH_SEC, ARRIVE_AFTER_SEC, LEAVE_SEC, PERCH_Y, perchedAfter, rodDragonflyAt, rodDragonflyOut } from "./dragonflyPerch";

describe("dragonfly on the rod tip", () => {
  it("comes out on dry summer days only", () => {
    expect(rodDragonflyOut("day", "clear", "summer")).toBe(true);
    expect(rodDragonflyOut("day", "overcast", "summer")).toBe(true);
    expect(rodDragonflyOut("day", "rain", "summer")).toBe(false);
    expect(rodDragonflyOut("dusk", "clear", "summer")).toBe(false);
    expect(rodDragonflyOut("day", "clear", "spring")).toBe(false);
  });

  it("waits for a quiet line, flies in, and then sits on the tip", () => {
    expect(rodDragonflyAt(ARRIVE_AFTER_SEC - 0.1, null).here).toBe(false);
    const coming = rodDragonflyAt(ARRIVE_AFTER_SEC + APPROACH_SEC / 2, null);
    expect(coming.here).toBe(true);
    expect(coming.buzz).toBe(1);
    expect(Math.hypot(coming.x, coming.z)).toBeGreaterThan(0.1);
    for (const sat of [0.1, 3, 20, 200]) {
      const pose = rodDragonflyAt(ARRIVE_AFTER_SEC + APPROACH_SEC + sat, null);
      expect(pose.here).toBe(true);
      expect([pose.x, pose.y, pose.z]).toEqual([0, PERCH_Y, 0]);
    }
  });

  it("flies in and off without jumps", () => {
    let last = rodDragonflyAt(ARRIVE_AFTER_SEC, null);
    for (let q = ARRIVE_AFTER_SEC + 0.01; q < ARRIVE_AFTER_SEC + APPROACH_SEC + 2; q += 0.01) {
      const pose = rodDragonflyAt(q, null);
      expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.05);
      last = pose;
    }
    // Disturbed while perched, and again while still coming in: off from where it was.
    for (const quiet of [ARRIVE_AFTER_SEC + APPROACH_SEC + 6, ARRIVE_AFTER_SEC + APPROACH_SEC / 3]) {
      let prev = rodDragonflyAt(quiet, null);
      for (let d = 0; d < LEAVE_SEC; d += 0.01) {
        const pose = rodDragonflyAt(0, d, perchedAfter(quiet));
        expect(Math.hypot(pose.x - prev.x, pose.y - prev.y, pose.z - prev.z)).toBeLessThan(0.05);
        prev = pose;
      }
      expect(rodDragonflyAt(0, LEAVE_SEC, perchedAfter(quiet)).here).toBe(false);
    }
  });

  it("does not fly off if it never came", () => {
    expect(rodDragonflyAt(0, 0.2, perchedAfter(ARRIVE_AFTER_SEC - 1)).here).toBe(false);
  });

  it("flicks its wings now and then while it sits", () => {
    let flicks = 0;
    let rest = 0;
    for (let s = 0; s < 30; s += 0.05) (rodDragonflyAt(ARRIVE_AFTER_SEC + APPROACH_SEC + s, null).buzz ? flicks++ : rest++);
    expect(flicks).toBeGreaterThan(0);
    expect(rest).toBeGreaterThan(flicks * 10);
  });

  it("sits still on the tip with reduced motion, and is simply gone when disturbed", () => {
    expect(rodDragonflyAt(ARRIVE_AFTER_SEC + 1, null, 0, true)).toEqual(rodDragonflyAt(500, null, 0, true));
    expect(rodDragonflyAt(0, 0.1, 5, true).here).toBe(false);
  });
});
