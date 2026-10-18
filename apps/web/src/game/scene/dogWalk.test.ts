import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, lakeEdge } from "@stillwater/shared";
import { OWL_TREE } from "./owlMotion";
import { PATH_LENGTH, TURN_SEC, WALK_SEC, dogAt, dogWalkOut, walkPath, walkerAt } from "./dogWalk";

/** Behind the drawn waterline, whose ring is the shape's (+y the world's -z). */
function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx));
}

describe("dog walk", () => {
  it("is out by day from spring to fall, rain or shine", () => {
    expect(dogWalkOut("day", "summer")).toBe(true);
    expect(dogWalkOut("day", "fall")).toBe(true);
    expect(dogWalkOut("day", "winter")).toBe(false);
    expect(dogWalkOut("dusk", "spring")).toBe(false);
  });

  it("keeps the path on dry land along the far bank", () => {
    for (let u = 0; u <= 1; u += 0.05) {
      const at = walkPath(u);
      expect(inLake(at.x, at.z)).toBe(false);
      expect(at.z).toBeLessThan(-12);
    }
    expect(PATH_LENGTH).toBeGreaterThan(15);
  });

  it("passes in front of the owl's tree rather than through it", () => {
    for (let t = 0; t < 2 * (WALK_SEC + TURN_SEC); t += 0.2) {
      const walker = walkerAt(t);
      expect(Math.hypot(walker.x - OWL_TREE.x, walker.z - OWL_TREE.z)).toBeGreaterThan(0.6);
      expect(onLand(dogAt(t))).toBe(true);
    }
  });

  it("walks smoothly, never jumping between frames, turning at the ends", () => {
    for (let t = 0; t < 4 * (WALK_SEC + TURN_SEC); t += 0.05) {
      const a = walkerAt(t);
      const b = walkerAt(t + 0.05);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.1);
      const da = dogAt(t);
      const db = dogAt(t + 0.05);
      expect(Math.hypot(db.x - da.x, db.z - da.z)).toBeLessThan(0.15);
    }
  });

  it("lets the dog run ahead, stop to sniff and run on, staying near the walker", () => {
    let sniffs = 0;
    let runs = 0;
    for (let t = 0; t < 2 * (WALK_SEC + TURN_SEC); t += 0.1) {
      const dog = dogAt(t);
      const walker = walkerAt(t);
      if (dog.sniff > 0.5) sniffs += 1;
      if (dog.run > 0.5) runs += 1;
      expect(Math.hypot(dog.x - walker.x, dog.z - walker.z)).toBeLessThan(5);
    }
    expect(sniffs).toBeGreaterThan(20);
    expect(runs).toBeGreaterThan(20);
  });

  it("holds both still with reduced motion", () => {
    expect(walkerAt(3, true)).toEqual(walkerAt(300, true));
    expect(dogAt(3, true)).toEqual(dogAt(300, true));
  });
});
