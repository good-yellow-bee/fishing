import { describe, expect, it } from "vitest";
import { SQUIRREL_CYCLE_SEC, squirrelAt, squirrelRuns, squirrelsOut, type Tree } from "./squirrelRun";

const A: Tree = { position: [-10, -0.08, -14], scale: 4 };
const B: Tree = { position: [-5, -0.08, -15], scale: 4.5 };

describe("squirrels on the far bank", () => {
  it("are out on dry days from spring to fall", () => {
    expect(squirrelsOut("day", "clear", "summer")).toBe(true);
    expect(squirrelsOut("dawn", "overcast", "fall")).toBe(true);
    expect(squirrelsOut("day", "rain", "summer")).toBe(false);
    expect(squirrelsOut("night", "clear", "summer")).toBe(false);
    expect(squirrelsOut("day", "clear", "winter")).toBe(false);
  });

  it("run between neighbouring trees a dash apart", () => {
    const far: Tree = { position: [30, 0, -14], scale: 4 };
    expect(squirrelRuns([A, B, far], 3)).toEqual([[A, B]]);
    const row = Array.from({ length: 20 }, (_, i): Tree => ({ position: [i * 4, 0, -14], scale: 4 }));
    expect(squirrelRuns(row, 3)).toHaveLength(3);
  });

  it("come down one tree, cross the grass, sit up on the way, and go up the other", () => {
    const poses = Array.from({ length: SQUIRREL_CYCLE_SEC * 10 }, (_, i) => squirrelAt(0, [A, B], i / 10));
    const shown = poses.filter((pose) => pose !== null);
    expect(shown.length).toBeGreaterThan(poses.length / 3);
    expect(shown.length).toBeLessThan(poses.length);
    // Nose down coming down the first tree, nose up going up the second.
    expect(shown.some((pose) => pose.pitch > 0 && pose.y > 1.5 && Math.hypot(pose.x - A.position[0], pose.z - A.position[2]) < 0.5)).toBe(true);
    expect(shown.some((pose) => pose.pitch < 0 && pose.y > 1.5 && Math.hypot(pose.x - B.position[0], pose.z - B.position[2]) < 0.5)).toBe(true);
    expect(shown.some((pose) => pose.sit > 0.9)).toBe(true);
    const near = (pose: { x: number; z: number }, tree: Tree) => Math.hypot(pose.x - tree.position[0], pose.z - tree.position[2]);
    const first = shown[0]!;
    const last = shown[shown.length - 1]!;
    expect(near(first, A)).toBeLessThan(0.5);
    expect(near(last, B)).toBeLessThan(0.5);
    for (const pose of shown) expect(pose.y).toBeGreaterThanOrEqual(0);
  });

  it("go back the other way the next time round", () => {
    const start = squirrelAt(0, [A, B], SQUIRREL_CYCLE_SEC + 0.1)!;
    expect(Math.hypot(start.x - B.position[0], start.z - B.position[2])).toBeLessThan(0.5);
  });
});
