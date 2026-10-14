import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { applyToon, releaseSharedMaterials, shareMaterials, sharedMaterialCount } from "./toon";

function tree(color: number) {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color })));
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0x664422 })));
  applyToon(root);
  shareMaterials(root);
  return root;
}

function materials(root: THREE.Object3D) {
  const out: THREE.Material[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) out.push(obj.material as THREE.Material);
  });
  return out;
}

describe("shared scenery materials", () => {
  it("gives copies that look the same one material, and keeps different looks apart", () => {
    const before = sharedMaterialCount();
    const a = tree(0x33aa33);
    const b = tree(0x33aa33);
    const c = tree(0xcc8833);
    expect(materials(a)[0]).toBe(materials(b)[0]);
    expect(materials(a)[1]).toBe(materials(c)[1]);
    expect(materials(a)[0]).not.toBe(materials(c)[0]);
    expect(sharedMaterialCount() - before).toBe(3);
    [a, b, c].forEach(releaseSharedMaterials);
    expect(sharedMaterialCount()).toBe(before);
  });

  it("disposes a shared material only when its last copy lets go", () => {
    const a = tree(0x123456);
    const b = tree(0x123456);
    const shared = materials(a)[0]!;
    const dispose = vi.spyOn(shared, "dispose");
    releaseSharedMaterials(a);
    expect(dispose).not.toHaveBeenCalled();
    releaseSharedMaterials(b);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
