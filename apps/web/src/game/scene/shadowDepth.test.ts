import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { assignShadowDepths, depthKey } from "./shadowDepth";

const box = new THREE.BoxGeometry();
const caster = <M extends THREE.Mesh>(mesh: M): M => {
  mesh.castShadow = true;
  return mesh;
};

describe("shadow depth materials", () => {
  it("share one depth material per kind of caster, and keep instanced, skinned, cut-out and two-sided casters apart", () => {
    const toon = new THREE.MeshToonMaterial();
    const plainA = caster(new THREE.Mesh(box, toon));
    const plainB = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ color: "#ff0000" })));
    expect(depthKey(plainA, plainA.material as THREE.Material)).toBe(depthKey(plainB, plainB.material as THREE.Material));
    const instanced = caster(new THREE.InstancedMesh(box, toon, 2));
    const skinned = caster(new THREE.SkinnedMesh(box, toon));
    const twoSided = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ side: THREE.DoubleSide })));
    const cutOut = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ map: new THREE.Texture(), alphaTest: 0.5 })));
    const tinted = caster(new THREE.InstancedMesh(box, toon, 2));
    tinted.setColorAt(0, new THREE.Color("#ff0000"));
    const covered = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ alphaToCoverage: true })));
    const kinds = [plainA, instanced, skinned, twoSided, cutOut, tinted, covered].map((mesh) => depthKey(mesh, mesh.material as THREE.Material));
    expect(new Set(kinds).size).toBe(7);
    // Two maps alike in all else share one.
    const otherMap = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ map: new THREE.Texture(), alphaTest: 0.3 })));
    expect(depthKey(otherMap, otherMap.material as THREE.Material)).toBe(depthKey(cutOut, cutOut.material as THREE.Material));
    // Clipped or displaced casters are left to three.
    const clipped = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial({ clippingPlanes: [new THREE.Plane()] })));
    expect(depthKey(clipped, clipped.material as THREE.Material)).toBeNull();
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
    expect((cast.customDepthMaterial as THREE.MeshDepthMaterial).depthPacking).toBe(new THREE.MeshDepthMaterial().depthPacking);
    expect(still.customDepthMaterial).toBeUndefined();
    expect(multi.customDepthMaterial).toBeUndefined();
    expect(own.customDepthMaterial).toBe(custom);
  });

  it("gives a caster a new depth material when its own changes kind", () => {
    const root = new THREE.Group();
    const mesh = caster(new THREE.Mesh(box, new THREE.MeshToonMaterial()));
    root.add(mesh);
    assignShadowDepths(root);
    const first = mesh.customDepthMaterial;
    mesh.material = new THREE.MeshToonMaterial({ side: THREE.DoubleSide });
    assignShadowDepths(root);
    expect(mesh.customDepthMaterial).not.toBe(first);
    mesh.material = new THREE.MeshToonMaterial({ clippingPlanes: [new THREE.Plane()] });
    assignShadowDepths(root);
    expect(mesh.customDepthMaterial).toBeUndefined();
  });
});
