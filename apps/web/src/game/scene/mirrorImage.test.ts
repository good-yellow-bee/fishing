import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RZ, inLake } from "@stillwater/shared";
import { MIRROR_PX, MIRROR_PY, bankMirrorStrength, hillMirror, mirrorCanvasPoint, mirrorPoint, mirrorStale, treeMirror } from "./mirrorImage";

const CALM = { x: 0, z: 0 };
const DOCK_EYE = { x: 0.5, y: 4, z: 12 };

describe("the bank's mirror image", () => {
  it("is clearest on a still clear dawn and gone in the rain", () => {
    expect(bankMirrorStrength("dawn", "clear", CALM)).toBeGreaterThan(bankMirrorStrength("day", "clear", CALM));
    expect(bankMirrorStrength("day", "overcast", CALM)).toBeLessThan(bankMirrorStrength("day", "clear", CALM));
    expect(bankMirrorStrength("day", "fog", CALM)).toBeLessThan(0.2);
    expect(bankMirrorStrength("day", "rain", CALM)).toBe(0);
  });

  it("breaks up in the wind: a light wind dims it, a strong one leaves almost none", () => {
    const still = bankMirrorStrength("day", "clear", CALM);
    expect(bankMirrorStrength("day", "clear", { x: 0.04, z: 0 })).toBeLessThan(still * 0.8);
    expect(bankMirrorStrength("day", "clear", { x: 0, z: -0.13 })).toBeLessThan(still * 0.15);
  });

  it("lands each point where the eye sees it on the water: the taller, the nearer the eye", () => {
    const low = mirrorPoint([0, 1, -20], DOCK_EYE);
    const high = mirrorPoint([0, 6, -20], DOCK_EYE);
    expect(low.z).toBeLessThan(high.z);
    expect(high.z).toBeLessThan(DOCK_EYE.z);
    // At the water line the image is the point itself.
    expect(mirrorPoint([3, 0, -20], DOCK_EYE)).toMatchObject({ x: 3, z: -20, t: 1 });
  });

  it("mirrors a far-shore tree from the bank out over the water toward the dock", () => {
    const tree = treeMirror([0, -0.08, -21], 5, DOCK_EYE)!;
    expect(tree).not.toBeNull();
    expect(inLake(tree.crown.x, tree.crown.z)).toBe(true);
    expect(tree.trunk.from.z).toBeLessThan(tree.trunk.to.z);
    // The crown's long axis runs north-south, toward the eye.
    expect(Math.abs(Math.sin(tree.crown.angle))).toBeGreaterThan(0.9);
    expect(tree.crown.along).toBeGreaterThan(tree.crown.across);
  });

  it("shows nothing for a tree whose image would fall on the bank, or from under the water", () => {
    // A tree behind the eye on the near bank mirrors away from the lake.
    expect(treeMirror([0, -0.08, 18], 4, DOCK_EYE)).toBeNull();
    expect(treeMirror([0, -0.08, -21], 5, { ...DOCK_EYE, y: 0 })).toBeNull();
  });

  it("mirrors a hill behind the far shore", () => {
    const hill = hillMirror([-5, 5.2, -30], [20, 8, 10], DOCK_EYE)!;
    expect(inLake(hill.x, hill.z)).toBe(true);
  });

  it("lays the far shore at the top of the canvas and the near shore at the bottom", () => {
    expect(mirrorCanvasPoint(0, LAKE_CENTER_Z - LAKE_RZ).py).toBeCloseTo(0);
    expect(mirrorCanvasPoint(0, LAKE_CENTER_Z + LAKE_RZ).py).toBeCloseTo(MIRROR_PY);
    expect(mirrorCanvasPoint(0, LAKE_CENTER_Z).px).toBeCloseTo(MIRROR_PX / 2);
  });

  it("repaints only once the eye has moved to somewhere new", () => {
    expect(mirrorStale(null, DOCK_EYE)).toBe(true);
    expect(mirrorStale(DOCK_EYE, { ...DOCK_EYE, x: DOCK_EYE.x + 0.3 })).toBe(false);
    expect(mirrorStale(DOCK_EYE, { ...DOCK_EYE, z: DOCK_EYE.z - 5 })).toBe(true);
  });
});
