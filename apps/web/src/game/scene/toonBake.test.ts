import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { bakeToon } from "./toonBake";

function part(color: string, x: number, material: Partial<THREE.MeshToonMaterialParameters> = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ color, ...material }));
  mesh.position.x = x;
  return mesh;
}

describe("baking a toon model", () => {
  it("draws a model's coloured parts as one mesh, each part's colour in its vertices and in its place", () => {
    const root = new THREE.Group();
    root.add(part("#ff0000", -2), part("#0000ff", 2));
    const baked = bakeToon(root, true)!;
    const meshes: THREE.Mesh[] = [];
    baked.traverse((obj) => obj instanceof THREE.Mesh && meshes.push(obj));
    expect(meshes).toHaveLength(1);
    const shape = meshes[0]!.geometry;
    const colors = shape.getAttribute("color");
    const positions = shape.getAttribute("position");
    expect(positions.count).toBe(72);
    for (let i = 0; i < positions.count; i += 1) {
      const red = positions.getX(i) < 0;
      expect(colors.getX(i)).toBeCloseTo(red ? 1 : 0);
      expect(colors.getZ(i)).toBeCloseTo(red ? 0 : 1);
    }
    expect(meshes[0]!.castShadow).toBe(true);
    expect(baked.userData.baked).toBe(true);
  });

  it("leaves textured, see-through and single-part models as they are", () => {
    const textured = new THREE.Group();
    textured.add(part("#ff0000", 0, { map: new THREE.Texture() }), part("#00ff00", 1));
    expect(bakeToon(textured, true)).toBeNull();
    const glass = new THREE.Group();
    glass.add(part("#ff0000", 0, { transparent: true, opacity: 0.5 }), part("#00ff00", 1));
    expect(bakeToon(glass, true)).toBeNull();
    const single = new THREE.Group();
    single.add(part("#ff0000", 0));
    expect(bakeToon(single, true)).toBeNull();
  });
});
