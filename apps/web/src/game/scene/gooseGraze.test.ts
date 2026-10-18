import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { walkPath } from "./dogWalk";
import { GOSLINGS, PARENTS, gooseAt, gooseFamilyOut } from "./gooseGraze";

const BIRDS = PARENTS + GOSLINGS;

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("goose family", () => {
  it("grazes at dawn and by day in spring", () => {
    expect(gooseFamilyOut("dawn", "spring")).toBe(true);
    expect(gooseFamilyOut("day", "spring")).toBe(true);
    expect(gooseFamilyOut("dusk", "spring")).toBe(false);
    expect(gooseFamilyOut("day", "summer")).toBe(false);
  });

  it("keeps every bird on the grass, the family together, clear of the dog walker's path", () => {
    const path = Array.from({ length: 41 }, (_, i) => walkPath(i / 40));
    for (let t = 0; t < 300; t += 2.5) {
      const birds = Array.from({ length: BIRDS }, (_, i) => gooseAt(i, t));
      const mid = { x: birds.reduce((s, b) => s + b.x, 0) / BIRDS, z: birds.reduce((s, b) => s + b.z, 0) / BIRDS };
      for (const bird of birds) {
        expect(onLand(bird)).toBe(true);
        expect(Math.hypot(bird.x - mid.x, bird.z - mid.z)).toBeLessThan(2.5);
        expect(Math.min(...path.map((p) => Math.hypot(p.x - bird.x, p.z - bird.z)))).toBeGreaterThan(0.8);
        expect(bird.peck).toBeGreaterThanOrEqual(0);
        expect(bird.peck).toBeLessThanOrEqual(1);
      }
    }
  });

  it("drifts the family along the bank over a few minutes, moving gently", () => {
    const start = gooseAt(0, 0);
    const later = gooseAt(0, 75);
    expect(Math.hypot(later.x - start.x, later.z - start.z)).toBeGreaterThan(2);
    for (let t = 0; t < 150; t += 0.1) {
      const a = gooseAt(3, t);
      const b = gooseAt(3, t + 0.1);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.05);
    }
  });

  it("holds the family still with reduced motion", () => {
    for (let i = 0; i < BIRDS; i += 1) expect(gooseAt(i, 5, true)).toEqual(gooseAt(i, 500, true));
  });
});
