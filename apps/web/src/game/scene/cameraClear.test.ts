import { inLake } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { CLEAR_MARGIN, CLEAR_MIN, clearDistance, easePull, treeShape, type HillShape } from "./cameraClear";
import { CAMERA_HILLS, CAMERA_TREES } from "./LakeWorld";

const HILL: HillShape = { center: [0, 1.4, -20], radii: [10, 6, 5] };
const angler = { x: 0, y: 1.4, z: 0 };

describe("camera clearance", () => {
  it("leaves the camera alone when the line to it is clear", () => {
    const camera = { x: 0, y: 6, z: 10 };
    expect(clearDistance(angler, camera, [HILL], [treeShape([8, 0, 0], 4)])).toBeCloseTo(Math.hypot(4.6, 10));
  });

  it("pulls in short of a hill between the angler and the camera", () => {
    // The hill's near face is at z = -15 along this flat line.
    const camera = { x: 0, y: 1.4, z: -22 };
    expect(clearDistance(angler, camera, [HILL], [])).toBeCloseTo(15 - CLEAR_MARGIN, 3);
  });

  it("pulls in short of a tree trunk, and not for one beside the line", () => {
    const tree = treeShape([0, 0, 8], 4);
    const camera = { x: 0, y: 3, z: 12 };
    const clear = clearDistance(angler, camera, [], [tree]);
    expect(clear).toBeLessThan(8 - tree.radius);
    expect(clear).toBeGreaterThan(8 - tree.radius - CLEAR_MARGIN - 0.2);
    expect(clearDistance(angler, { x: 6, y: 3, z: 12 }, [], [tree])).toBeCloseTo(Math.hypot(6, 1.6, 12));
  });

  it("looks over a tree whose crown stays below the line", () => {
    const low = treeShape([0, 0, 6], 1);
    const camera = { x: 0, y: 9, z: 10 };
    expect(clearDistance(angler, camera, [], [low])).toBeCloseTo(Math.hypot(7.6, 10));
  });

  it("never pulls closer than the minimum", () => {
    const tree = treeShape([0, 0, 2.2], 4);
    expect(clearDistance(angler, { x: 0, y: 3, z: 9 }, [], [tree])).toBe(CLEAR_MIN);
  });

  it("pulls in at once and eases back out", () => {
    expect(easePull(0, 3, 1 / 60)).toBe(3);
    const out = easePull(3, 0, 1 / 60);
    expect(out).toBeLessThan(3);
    expect(out).toBeGreaterThan(2.8);
    let pull = 3;
    for (let i = 0; i < 180; i++) pull = easePull(pull, 0, 1 / 60);
    expect(pull).toBeLessThan(0.01);
  });

  it("knows the lake's hills and shore trees, all on land", () => {
    expect(CAMERA_HILLS).toHaveLength(3);
    expect(CAMERA_TREES.length).toBeGreaterThan(30);
    for (const tree of CAMERA_TREES) expect(inLake(tree.x, tree.z)).toBe(false);
  });
});
