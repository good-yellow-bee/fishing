// @vitest-environment jsdom
import { act } from "react";
import { createRoot, extend, type ReconcilerRoot } from "@react-three/fiber";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FishShadow } from "./FishShadow";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

const { Group, Mesh, SphereGeometry, ConeGeometry, MeshBasicMaterial } = THREE;
extend({ Group, Mesh, SphereGeometry, ConeGeometry, MeshBasicMaterial });
const gl = { render() {}, setPixelRatio() {}, setSize() {} };
let root: ReconcilerRoot<HTMLCanvasElement> | null = null;
const bobber = { x: 4, z: -2 };

async function shadowAt(level: number, phase: ScenePhase, weight: number) {
  root ??= createRoot(document.createElement("canvas"));
  await root.configure({ gl, frameloop: "never", size: { width: 1, height: 1, top: 0, left: 0 } });
  const store = root.render(<FishShadow level={level} phase={phase} weight={weight} bobber={bobber} />);
  await act(async () => {});
  store.getState().advance(1);
  const group = store.getState().scene.children[0] as THREE.Group;
  return group;
}

beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  vi.unstubAllGlobals();
});

describe("bite shadow", () => {
  it("appears at level 4 on the bite, then disappears on the strike", async () => {
    expect((await shadowAt(3, "hookset", 4)).visible).toBe(false);
    expect((await shadowAt(4, "hookset", 4)).visible).toBe(true);
    expect((await shadowAt(4, "fight", 4)).visible).toBe(false);
  });

  it.each(["idle", "casting", "waiting", "result"] as const)("stays hidden during %s", async (phase) => {
    expect((await shadowAt(4, phase, 4)).visible).toBe(false);
  });

  it("scales with the actual rolled weight", async () => {
    const light = (await shadowAt(4, "hookset", 0.3)).scale.x;
    const heavy = (await shadowAt(4, "hookset", 12)).scale.x;
    expect(heavy).toBeGreaterThan(light);
    expect(heavy).toBeCloseTo(0.5 + 12 / 28);
  });

  it("follows the bobber just below the water, with a dark silhouette over the transparent surface", async () => {
    const group = await shadowAt(4, "hookset", 4);
    expect(Math.abs(group.position.x - bobber.x)).toBeLessThanOrEqual(0.24);
    expect(Math.abs(group.position.z - bobber.z)).toBeLessThanOrEqual(0.18);
    expect(group.position.y).toBeCloseTo(waterHeight(group.position.x, group.position.z, 1) - 0.12);
    expect(group.children).toHaveLength(2);
    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      expect(mesh.renderOrder).toBe(1);
      expect(new THREE.Color(material.color).getHexString()).toBe("172c34");
      expect(material).toMatchObject({ transparent: true, depthWrite: false });
    }
  });
});
