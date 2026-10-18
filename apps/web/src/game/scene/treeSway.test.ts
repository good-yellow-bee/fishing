import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { SWAY_REF_HEIGHT, releaseSwayingMaterial, swayingMaterial, treeSway } from "./treeSway";

const EAST = { x: 0.08, z: 0 };
const CALM = { x: 0, z: 0 };

describe("shore trees in the wind", () => {
  it("never move at the foot of the trunk, and sway more toward the top", () => {
    expect(treeSway(3, 2, 0, EAST, 4)).toEqual({ x: 0, z: 0 });
    const low = Math.abs(treeSway(3, 2, 1.5, EAST, 4).x);
    const high = Math.abs(treeSway(3, 2, SWAY_REF_HEIGHT, EAST, 4).x);
    expect(high).toBeGreaterThan(low * 4);
  });

  it("lean downwind on average, further in a stronger wind", () => {
    const mean = (wind: { x: number; z: number }) => {
      let sum = 0;
      for (let t = 0; t < 120; t += 0.1) sum += treeSway(0, 0, SWAY_REF_HEIGHT, wind, t).x;
      return sum / 1200;
    };
    expect(mean(EAST)).toBeGreaterThan(0.08);
    expect(mean(EAST)).toBeGreaterThan(mean({ x: 0.03, z: 0 }));
    expect(Math.abs(mean(CALM))).toBeLessThan(0.01);
    expect(treeSway(0, 0, SWAY_REF_HEIGHT, { x: 0, z: 0.08 }, 1).x).toBe(0);
  });

  it("keep a breath of sway on a calm day, and neighbours sway out of step", () => {
    const top = (x: number, t: number) => treeSway(x, 0, SWAY_REF_HEIGHT, CALM, t).x;
    const swing = Array.from({ length: 100 }, (_, t) => top(0, t * 0.1));
    expect(Math.max(...swing) - Math.min(...swing)).toBeGreaterThan(0.03);
    expect(Math.max(...swing)).toBeLessThanOrEqual(0.026);
    expect(top(0, 2)).not.toBeCloseTo(top(12, 2), 3);
  });

  it("sways a copy of a tree's material, one copy per material, and leaves the original alone", () => {
    const leaves = new THREE.MeshToonMaterial({ color: "#4a7" });
    const copy = swayingMaterial(leaves);
    expect(copy).not.toBe(leaves);
    expect(swayingMaterial(leaves)).toBe(copy);
    expect(leaves.onBeforeCompile).not.toBe(copy.onBeforeCompile);
    const shader = { uniforms: {}, vertexShader: "void main() {\n#include <project_vertex>\n}", fragmentShader: "" };
    copy.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain("uSwayWind");
    expect(shader.vertexShader).toContain("mvPosition.xz += swayDir");
    expect(shader.vertexShader).not.toContain("#include <project_vertex>");
    expect(Object.keys(shader.uniforms)).toEqual(["uSwayTime", "uSwayWind"]);
    let disposed = 0;
    copy.addEventListener("dispose", () => (disposed += 1));
    releaseSwayingMaterial(leaves);
    expect(disposed).toBe(0);
    releaseSwayingMaterial(leaves);
    expect(disposed).toBe(1);
    expect(swayingMaterial(leaves)).not.toBe(copy);
  });
});
