// @vitest-environment jsdom
import { act } from "react";
import { createRoot, extend, type ReconcilerRoot } from "@react-three/fiber";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticulatedFish } from "./ArticulatedFish";

const { Group, Mesh, SphereGeometry, ConeGeometry, MeshBasicMaterial, MeshToonMaterial } = THREE;
extend({ Group, Mesh, SphereGeometry, ConeGeometry, MeshBasicMaterial, MeshToonMaterial });

// Fields WebGLPrograms keys a shader program on; equal values mean the prepass and coat share one.
const PROGRAM_KEYS = ["type", "transparent", "toneMapped", "fog", "side", "premultipliedAlpha", "alphaTest", "vertexColors", "dithering", "blending"] as const;

const shape = (mesh: THREE.Mesh) => [mesh.geometry.type, (mesh.geometry as THREE.SphereGeometry).parameters];

// Builds the scene graph without WebGL; nothing is ever drawn.
const gl = { render() {}, setPixelRatio() {}, setSize() {} };

let root: ReconcilerRoot<HTMLCanvasElement> | null = null;

async function fishMeshes(unlit: boolean) {
  root = createRoot(document.createElement("canvas"));
  await root.configure({ gl, frameloop: "never", size: { width: 1, height: 1, top: 0, left: 0 } });
  const store = root.render(<ArticulatedFish unlit={unlit} />);
  await act(async () => {});
  const meshes: THREE.Mesh[] = [];
  store.getState().scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
  });
  return meshes;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  vi.unstubAllGlobals();
});

describe("ArticulatedFish", () => {
  it("draws each hooked part as a depth prepass on the coat's shader program, then one coat over the nearest surface", async () => {
    const meshes = await fishMeshes(true);
    expect(meshes).toHaveLength(22);
    for (let i = 0; i < meshes.length; i += 2) {
      const [prepass, coat] = [meshes[i], meshes[i + 1]];
      const depth = prepass.material as THREE.MeshBasicMaterial;
      const paint = coat.material as THREE.MeshBasicMaterial;
      expect(prepass.parent).toBe(coat.parent);
      expect(prepass.position.equals(coat.position)).toBe(true);
      expect(prepass.quaternion.equals(coat.quaternion)).toBe(true);
      expect(prepass.scale.equals(coat.scale)).toBe(true);
      expect(shape(prepass)).toEqual(shape(coat));
      expect(prepass.renderOrder).toBe(1);
      expect(depth).toMatchObject({ colorWrite: false, depthWrite: true, depthTest: true, depthFunc: THREE.LessEqualDepth });
      for (const key of PROGRAM_KEYS) expect(depth[key], key).toBe(paint[key]);
      expect(coat.renderOrder).toBe(2);
      expect(paint).toMatchObject({ isMeshBasicMaterial: true, transparent: true, toneMapped: false, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth, stencilWrite: false });
      expect(prepass.castShadow || coat.castShadow).toBe(false);
    }
  });

  it("keeps the lit fish as single opaque toon meshes with body shadows", async () => {
    const meshes = await fishMeshes(false);
    expect(meshes).toHaveLength(11);
    expect(meshes.every((mesh) => mesh.renderOrder === 0 && !(mesh.material as THREE.Material).transparent)).toBe(true);
    expect(meshes.filter((mesh) => mesh.castShadow)).toHaveLength(4);
  });
});
