import { describe, expect, it } from "vitest";
import { BOLT_BOTTOM, BOLT_POINTS, BOLT_TOP, boltMirror, boltPath } from "./boltPath";

const DOCK_EYE = { x: 0, y: 3.6, z: 11 };

describe("bolt path", () => {
  it("is the same bolt for the same strike and a different one for the next", () => {
    expect(boltPath(0.42)).toEqual(boltPath(0.42));
    expect(boltPath(0.42)[0]![0]).not.toBeCloseTo(boltPath(0.43)[0]![0], 3);
  });

  it("runs from the cloud base down to behind the hills, jagged on the way", () => {
    const path = boltPath(0.7);
    expect(path).toHaveLength(BOLT_POINTS);
    expect(path[0]![1]).toBe(BOLT_TOP);
    expect(path[BOLT_POINTS - 1]![1]).toBeCloseTo(BOLT_BOTTOM, 6);
    for (let i = 1; i < path.length; i += 1) expect(path[i]![1]).toBeLessThan(path[i - 1]![1]);
    const xs = new Set(path.map((p) => p[0].toFixed(3)));
    expect(xs.size).toBeGreaterThan(5);
  });

  it("shows in the lake from the dock, its top nearest the angler", () => {
    for (const seed of [0.1, 0.35, 0.6, 0.9]) {
      const mirror = boltMirror(boltPath(seed), DOCK_EYE);
      expect(mirror.length).toBeGreaterThan(2);
      expect(mirror[0]!.z).toBeGreaterThan(mirror[mirror.length - 1]!.z);
    }
  });
});
