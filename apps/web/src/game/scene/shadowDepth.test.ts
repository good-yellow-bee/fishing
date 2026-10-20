import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { assignShadowDepths, depthFor } from "./shadowDepth";

const box = new THREE.BoxGeometry();
const caster = (mesh: THREE.Mesh) => {
  mesh.castShadow = true;
  return mesh;
};

describe("shadow depth materials", () => {
  it("share one depth material per kind of caster, and keep instanced, skinned, cut-out and two-sided casters apart", () => {
    const toon = new THREE.MeshToonMaterial();
    const plainA = caster(new THREE.Mesh(box, toon));
    const plainB = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ color: "#ff0000" })));
    expect(depthFor(plainA, plainA.material as THREE.Material)).toBe(depthFor(plainB, plainB.material as THREE.Material));
    const instanced = caster(new THREE.InstancedMesh(box, toon, 2));
    const skinned = caster(new THREE.SkinnedMesh(box, toon));
    const twoSided = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ side: THREE.DoubleSide })));
    const cutOut = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ map: new THREE.Texture(), alphaTest: 0.5 })));
    const kinds = [plainA, instanced, skinned, twoSided, cutOut].map((mesh) => depthFor(mesh, mesh.material as THREE.Material));
    expect(new Set(kinds).size).toBe(5);
  });

  it("gives every caster without one its kind's depth material, leaving non-casters, multi-material meshes and set ones alone", () => {
    const root = new THREE.Group();
    const cast = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial()));
    const still = new THREE.Mesh(box, new THREE.MeshToonMaterial());
    const multi = caster(new THREE.Mesh(box, [new THREE.MeshToonMaterial(), new THREE.MeshToonMaterial()]));
    const own = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial()));
    const custom = new THREE.MeshDepthMaterial();
    own.customDepthMaterial = custom;
    root.add(cast, still, multi, own);
    assignShadowDepths(root);
    expect(cast.customDepthMaterial).toBeInstanceOf(THREE.MeshDepthMaterial);
    expect((cast.customDepthMaterial as THREE.MeshDepthMaterial).depthPacking).toBe(THREE.RGBADepthPacking);
    expect(still.customDepthMaterial).toBeUndefined();
    expect(multi.customDepthMaterial).toBeUndefined();
    expect(own.customDepthMaterial).toBe(custom);
  });
});
